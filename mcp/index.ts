// Protect stdout — MCP uses stdio transport, so any non-JSON-RPC output on
// stdout (e.g. console.log/debug from game code) kills the connection.
console.log = console.error;
console.debug = console.error;

// Use CJS require for boardgame.io — its client entry points to a JSX file that
// ESM/tsx can't resolve, but the CJS dist works fine.
/* eslint-disable @typescript-eslint/no-require-imports */
const { Client, LobbyClient } = require('boardgame.io/dist/cjs/client.js');
const { SocketIO } = require('boardgame.io/dist/cjs/multiplayer.js');

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { BlankWhiteCards } from '../src/Game';
import { compressImageDataUri, compressImageFromFile } from './images';
import type { Card } from '../src/Cards';

const GAME_SERVER = process.env.GAME_SERVER_URL ?? 'http://localhost:3000';
const GAME_NAME = 'blank-white-cards';
const MIN_REACT_SECONDS = Number(process.env.MCP_MIN_REACT_SECONDS ?? 5);
const MAX_WATCH_SECONDS = Number(process.env.MCP_MAX_WATCH_SECONDS ?? 30);
const ENABLE_IMAGES = process.env.MCP_ENABLE_IMAGES === 'true';

// ── Session state ─────────────────────────────────────────────────────────────

interface Session {
  client: ReturnType<typeof Client>;
  credentials: string;
}
const sessions = new Map<string, Session>();



// ── Session helpers ───────────────────────────────────────────────────────────

function sessionKey(matchID: string, playerID: string) {
  return `${matchID}:${playerID}`;
}

async function connectSession(matchID: string, playerID: string, credentials: string): Promise<Session> {
  const key = sessionKey(matchID, playerID);
  const existing = sessions.get(key);
  if (existing) existing.client.stop?.();

  const client = Client({
    game: BlankWhiteCards,
    multiplayer: SocketIO({ server: GAME_SERVER }),
    matchID,
    playerID,
    credentials,
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out connecting to match')), 10000);
    const unsub = client.subscribe((state: unknown) => {
      if (state && (state as { G?: unknown }).G) {
        clearTimeout(timeout);
        unsub();
        resolve();
      }
    });
    client.start();
  });

  const session: Session = { client, credentials };
  sessions.set(key, session);
  return session;
}

function requireSession(matchID: string, playerID: string): Session {
  const session = sessions.get(sessionKey(matchID, playerID));
  if (!session) throw new Error(`Not in match ${matchID} as player ${playerID} — call join_match first`);
  return session;
}

// ── Card helpers ──────────────────────────────────────────────────────────────

function stripImage(card: Card) {
  const { image: _image, ...content } = card.content as Record<string, unknown>;
  return { id: card.id, content, location: card.location, owner: card.owner, likes: card.likes };
}

function formatState(state: { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID: string) {
  const { G, ctx } = state;
  const cards = G.cards;
  return {
    my_hand: cards.filter(c => c.location === 'hand' && c.owner === playerID).map(stripImage),
    my_table: cards.filter(c => c.location === 'table' && c.owner === playerID).map(stripImage),
    pile: cards.filter(c => c.location === 'pile').map(stripImage),
    deck_size: cards.filter(c => c.location === 'deck').length,
    discard_size: cards.filter(c => c.location === 'discard').length,
    box: cards.filter(c => c.location === 'box').map(stripImage),
    num_players: ctx.numPlayers,
    play_order: ctx.playOrder,
  };
}

function text(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

// Wait for the server to confirm the move, then return current state.
function waitForMove(client: ReturnType<typeof Client>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const before = client.store.getState()?._stateID;
    const timeout = setTimeout(() => {
      unsub();
      reject(new Error('Move timed out waiting for server confirmation'));
    }, 5000);
    const unsub = client.subscribe((state: unknown) => {
      if ((state as { _stateID?: number })?._stateID !== before) {
        clearTimeout(timeout);
        unsub();
        resolve(state);
      }
    });
  });
}

// ── Watch / diff helpers ──────────────────────────────────────────────────────

interface CardSnapshot {
  id: number;
  location: string;
  owner?: string;
  previousOwner?: string;
  likes?: number;
}

interface CardEvent {
  type: 'card_submitted' | 'card_claimed' | 'card_moved' | 'card_liked' | 'shuffled';
  card?: ReturnType<typeof stripImage>;
  cardID?: number;
  from?: string;
  to?: string;
  toOwner?: string;
  byPlayer?: string;
  likes?: number;
}

function snapshotCards(cards: Card[]): CardSnapshot[] {
  return cards.map(c => ({
    id: c.id,
    location: c.location,
    owner: c.owner,
    previousOwner: c.previousOwner,
    likes: c.likes,
  }));
}

function diffCards(prev: CardSnapshot[], next: Card[]): CardEvent[] {
  const prevMap = new Map(prev.map(c => [c.id, c]));
  const events: CardEvent[] = [];

  // Detect shuffle: many cards moved to deck at once
  const movedToDeck = next.filter(c => {
    const p = prevMap.get(c.id);
    return p && p.location !== 'deck' && c.location === 'deck';
  });
  if (movedToDeck.length > 3) {
    return [{ type: 'shuffled' }];
  }

  for (const card of next) {
    const p = prevMap.get(card.id);
    if (!p) {
      events.push({ type: 'card_submitted', card: stripImage(card) });
      continue;
    }
    if (p.location !== card.location) {
      if (p.location === 'pile' && card.location === 'hand') {
        events.push({ type: 'card_claimed', cardID: card.id, toOwner: card.owner, byPlayer: card.owner });
      } else {
        events.push({ type: 'card_moved', cardID: card.id, from: p.location, to: card.location, toOwner: card.owner, byPlayer: card.previousOwner });
      }
    }
    if ((card.likes ?? 0) > (p.likes ?? 0)) {
      events.push({ type: 'card_liked', cardID: card.id, likes: card.likes });
    }
  }

  return events;
}

function eventMatchesFlags(
  event: CardEvent,
  flags: { pile?: boolean; hand?: boolean; table?: boolean },
  playerID: string,
): boolean {
  if (!flags.pile && !flags.hand && !flags.table) return true;

  if (flags.pile) {
    if (event.type === 'card_submitted') return true;
    if (event.type === 'card_claimed') return true;
    if (event.type === 'card_moved' && (event.from === 'pile' || event.to === 'pile')) return true;
    if (event.type === 'shuffled') return true;
  }
  if (flags.hand) {
    if (event.type === 'card_claimed' && event.toOwner === playerID) return true;
    if (event.type === 'card_moved' && event.to === 'hand' && event.toOwner === playerID) return true;
    if (event.type === 'card_moved' && event.from === 'hand' && event.byPlayer === playerID) return true;
  }
  if (flags.table) {
    if (event.type === 'card_moved' && (event.to === 'table' || event.from === 'table')) return true;
  }

  return false;
}

function watchForChange(
  client: ReturnType<typeof Client>,
  playerID: string,
  flags: { pile?: boolean; hand?: boolean; table?: boolean },
  timeoutMs: number,
): Promise<{ changed: boolean; events: CardEvent[]; state?: unknown }> {
  return new Promise(resolve => {
    const currentState = client.store.getState();
    if (!currentState?.G?.cards) {
      resolve({ changed: false, events: [] });
      return;
    }

    const snapshot = snapshotCards(currentState.G.cards);
    let settled = false;
    let unsub: (() => void) | undefined;

    const done = (result: { changed: boolean; events: CardEvent[]; state?: unknown }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsub?.();
      resolve(result);
    };

    const timer = setTimeout(() => done({ changed: false, events: [] }), timeoutMs);

    unsub = client.subscribe((state: unknown) => {
      if (!state || !(state as { G?: { cards?: Card[] } }).G?.cards) return;
      const cards = (state as { G: { cards: Card[] } }).G.cards;
      const events = diffCards(snapshot, cards);
      const relevant = events.filter(e => eventMatchesFlags(e, flags, playerID));
      if (relevant.length > 0) {
        // Delay before returning so other players have time to digest the move
        setTimeout(() => done({ changed: true, events: relevant, state }), MIN_REACT_SECONDS * 1000);
      }
    });

    if (settled) unsub?.();
  });
}



// ── MCP Server ────────────────────────────────────────────────────────────────

const INSTRUCTIONS = `
This server provides tools for interacting with Blank White Cards — a creative, freeform card game where players write and play their own rules. There are no turns; all players act simultaneously.

## Card locations

- **deck** — undrawn cards. \`pickup_card\` draws into a player's hand.
- **hand** — a player's private cards. \`move_card\` plays them elsewhere.
- **pile** — the shared active area, visible to everyone.
- **table** — cards placed in front of a specific player (persistent effects).
- **discard** — removed from play.
- **box** — cards set aside outside the game.

## Observing changes

Use \`watch\` to block until a relevant event occurs (card submitted, claimed, moved, liked, or shuffled). This is more efficient than polling \`get_state\`. Only one \`watch\` can be active per session.

## Writing cards

\`submit_card\` creates a new card in a player's hand. Use \`move_card\` to play it to the pile or elsewhere.
${ENABLE_IMAGES ? `
## Card images

Cards can have images. If you have access to an image generation tool (e.g. ComfyUI, DALL-E, or any tool that produces PNG data URIs), use \`compress_image\` to convert the PNG into the game's 500x500 1-bit format, then pass the result as the \`image\` field in \`submit_card\`.
` : ''}
## Available prompts

This server provides role prompts (autonomous_player, referee, spectator, deck_builder) that describe how to use these tools for specific purposes. List prompts to see available roles.
`.trim();

const mcp = new McpServer(
  { name: 'blank-white-cards', version: '2.3.0' },
  { instructions: INSTRUCTIONS },
);

mcp.registerTool(
  'list_matches',
  { description: 'List all active Blank White Cards matches' },
  async () => {
    const lobby = new LobbyClient({ server: GAME_SERVER });
    const { matches } = await lobby.listMatches(GAME_NAME);
    return text(matches);
  }
);

mcp.registerTool(
  'create_match',
  {
    description: 'Create a new match and join it as player 0 (the host)',
    inputSchema: {
      num_players: z.number().int().min(1).max(100).optional().describe('Number of player seats (default 100)'),
      preset_deck: z.string().optional().describe('Preset deck name, e.g. "standard" (default blank)'),
      player_name: z.string().optional().describe('Your display name (default "Player 0")'),
    },
  },
  async ({ num_players, preset_deck, player_name }) => {
    const lobby = new LobbyClient({ server: GAME_SERVER });
    const { matchID } = await lobby.createMatch(GAME_NAME, {
      numPlayers: num_players ?? 100,
      setupData: preset_deck ? { presetDeck: preset_deck } : undefined,
    });
    const { playerCredentials } = await lobby.joinMatch(GAME_NAME, matchID, {
      playerID: '0',
      playerName: player_name ?? 'Player 0',
    });
    await connectSession(matchID, '0', playerCredentials);
    return text({ matchID, playerID: '0', credentials: playerCredentials, message: `Joined ${matchID} as player 0` });
  }
);

mcp.registerTool(
  'join_match',
  {
    description: 'Join an existing match as a specific player',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Seat number to join, e.g. "0", "1", "2"'),
      player_name: z.string().optional().describe('Your display name'),
    },
  },
  async ({ matchID, playerID, player_name }) => {
    const lobby = new LobbyClient({ server: GAME_SERVER });
    const { playerCredentials } = await lobby.joinMatch(GAME_NAME, matchID, {
      playerID,
      playerName: player_name ?? `Player ${playerID}`,
    });
    await connectSession(matchID, playerID, playerCredentials);
    return text({ matchID, playerID, message: `Joined ${matchID} as player ${playerID}` });
  }
);

mcp.registerTool(
  'get_state',
  {
    description: 'Get the current game state — your hand, the pile, deck size, all cards on the table',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
    },
  },
  async ({ matchID, playerID }) => {
    const { client } = requireSession(matchID, playerID);
    const state = client.store.getState();
    if (!state?.G) throw new Error('No state available yet');
    return text(formatState(state, playerID));
  }
);

mcp.registerTool(
  'get_card',
  {
    description: 'Get a single card by ID from the current match state',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
      cardID: z.number().int().describe('ID of the card to retrieve'),
    },
  },
  async ({ matchID, playerID, cardID }) => {
    const { client } = requireSession(matchID, playerID);
    const state = client.store.getState();
    if (!state?.G) throw new Error('No state available yet');
    const card = (state.G.cards as Card[]).find(c => c.id === cardID);
    if (!card) throw new Error(`Card ${cardID} not found`);
    return text(stripImage(card));
  }
);

mcp.registerTool(
  'search_cards',
  {
    description: 'Full-text search over card titles and descriptions in the current match',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
      query: z.string().describe('Search term (case-insensitive, matches title or description)'),
      location: z.enum(['deck', 'pile', 'discard', 'hand', 'table', 'box']).optional().describe('Restrict search to a specific location (default: all)'),
    },
  },
  async ({ matchID, playerID, query, location }) => {
    const { client } = requireSession(matchID, playerID);
    const state = client.store.getState();
    if (!state?.G) throw new Error('No state available yet');
    const q = query.toLowerCase();
    const results = (state.G.cards as Card[])
      .filter(c => !location || c.location === location)
      .filter(c => {
        const title = (c.content.title ?? '').toLowerCase();
        const desc = (c.content.description ?? '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      })
      .map(stripImage);
    return text({ query, count: results.length, results });
  }
);

mcp.registerTool(
  'export_deck',
  {
    description: 'Export all cards in a match as JSON (wraps the server /export/:matchID endpoint)',
    inputSchema: {
      matchID: z.string().describe('Room code'),
    },
  },
  async ({ matchID }) => {
    const res = await fetch(`${GAME_SERVER}/export/${matchID}`);
    if (!res.ok) throw new Error(`Export failed: ${res.status} ${res.statusText}`);
    const encoded = await res.text();
    const cards = JSON.parse(decodeURI(atob(encoded)));
    return text({ matchID, count: cards.length, cards });
  }
);

mcp.registerTool(
  'pickup_card',
  {
    description: 'Draw a card from the deck into your hand',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
    },
  },
  async ({ matchID, playerID }) => {
    const { client } = requireSession(matchID, playerID);
    const nextState = waitForMove(client);
    client.moves.pickupCard();
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID));
  }
);

mcp.registerTool(
  'move_card',
  {
    description: 'Move a card to a different location. Locations: deck, pile, discard, hand, table. Use "hand" with toOwner to pass a card to another player.',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
      cardID: z.number().int().describe('ID of the card to move'),
      target: z.enum(['deck', 'pile', 'discard', 'hand', 'table']).describe('Destination location'),
      toOwner: z.string().optional().describe('Player ID to give the card to (only for hand/table)'),
    },
  },
  async ({ matchID, playerID, cardID, target, toOwner }) => {
    const { client } = requireSession(matchID, playerID);
    const nextState = waitForMove(client);
    client.moves.moveCard(cardID, target, toOwner);
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID));
  }
);

mcp.registerTool(
  'claim_card',
  {
    description: 'Claim a card from the shared pile into your hand',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
      cardID: z.number().int().describe('ID of the pile card to claim'),
    },
  },
  async ({ matchID, playerID, cardID }) => {
    const { client } = requireSession(matchID, playerID);
    const nextState = waitForMove(client);
    client.moves.claimCard(cardID);
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID));
  }
);

mcp.registerTool(
  'submit_card',
  {
    description: 'Write a new card into your hand. Use move_card to play it to the pile when ready.',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
      title: z.string().describe('Card title / rule text'),
      description: z.string().optional().describe('Additional description or flavour text'),
      author: z.string().optional().describe('Author name to attribute on the card'),
      image: z.string().optional().describe('Compressed image string from compress_image tool'),
    },
  },
  async ({ matchID, playerID, title, description, author, image }) => {
    const { client } = requireSession(matchID, playerID);
    const card: Partial<Card> = {
      content: { title, description: description ?? '', author, date: String(Date.now()), image },
      location: 'hand',
      owner: playerID,
      timestamp: Date.now(),
    };
    const nextState = waitForMove(client);
    client.moves.submitCard(card);
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID));
  }
);

mcp.registerTool(
  'like_card',
  {
    description: 'Like a card to show appreciation',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
      cardID: z.number().int().describe('ID of the card to like'),
    },
  },
  async ({ matchID, playerID, cardID }) => {
    const { client } = requireSession(matchID, playerID);
    const nextState = waitForMove(client);
    client.moves.likeCard(cardID);
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID));
  }
);

mcp.registerTool(
  'shuffle_cards',
  {
    description: 'Reset all cards back to the deck and shuffle (host / player 0 only)',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID (must be 0)'),
    },
  },
  async ({ matchID, playerID }) => {
    const { client } = requireSession(matchID, playerID);
    const nextState = waitForMove(client);
    client.moves.shuffleCards();
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID));
  }
);

mcp.registerTool(
  'load_cards',
  {
    description: 'Bulk load a set of cards into the match (host / player 0 only)',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID (must be 0)'),
      cards: z.array(z.object({
        title: z.string(),
        description: z.string().optional(),
        author: z.string().optional(),
        location: z.enum(['deck', 'pile', 'discard']).optional(),
      })).describe('Cards to add'),
    },
  },
  async ({ matchID, playerID, cards }) => {
    const { client } = requireSession(matchID, playerID);
    const cardObjects: Partial<Card>[] = cards.map(c => ({
      content: { title: c.title, description: c.description ?? '', author: c.author },
      location: c.location ?? 'deck',
    }));
    const nextState = waitForMove(client);
    client.moves.loadCards(cardObjects);
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID));
  }
);

if (ENABLE_IMAGES) {
  mcp.registerTool(
    'compress_image',
    {
      description: 'Convert an image file to the 500x500 1-bit compressed format used by card images. Accepts any format ffmpeg supports. Save the image to a temp file first, then pass the absolute path here. Returns the compressed string to pass as the image field in submit_card.',
      inputSchema: {
        image_path: z.string().describe('Absolute path to an image file on disk'),
      },
    },
    async ({ image_path }) => {
      const compressed = compressImageFromFile(image_path);
      return text({ compressed, length: compressed.length });
    }
  );
}

mcp.registerTool(
  'watch',
  {
    description: 'Block until a relevant game event occurs, then return a structured diff of what changed. Use instead of polling get_state. Only one watch can be active at a time per agent session.',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
      pile: z.boolean().optional().describe('Fire when the pile changes (cards submitted, claimed, or moved to/from pile)'),
      hand: z.boolean().optional().describe('Fire when your hand changes (card received or removed)'),
      table: z.boolean().optional().describe('Fire when any table changes occur'),
      timeout_seconds: z.number().int().min(5).max(300).optional().describe(`How long to wait before giving up (default ${MAX_WATCH_SECONDS}s, set by MCP_MAX_WATCH_SECONDS)`),
    },
  },
  async ({ matchID, playerID, pile, hand, table, timeout_seconds }) => {
    const { client } = requireSession(matchID, playerID);
    const flags = { pile: pile ?? false, hand: hand ?? false, table: table ?? false };
    const { changed, events, state } = await watchForChange(client, playerID, flags, (timeout_seconds ?? MAX_WATCH_SECONDS) * 1000);
    if (!changed) return text({ changed: false, message: 'No activity — your turn to act. Draw a card, submit something, or play from your hand. Then call watch again.' });
    return text({
      changed: true,
      events,
      state: formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID),
    });
  }
);



mcp.registerTool(
  'leave_match',
  {
    description: 'Leave a match and clean up the local session',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
    },
  },
  async ({ matchID, playerID }) => {
    const key = sessionKey(matchID, playerID);
    const session = sessions.get(key);
    if (!session) return text({ message: `Not in match ${matchID} as player ${playerID}` });
    const lobby = new LobbyClient({ server: GAME_SERVER });
    try {
      await lobby.leaveMatch(GAME_NAME, matchID, { playerID, credentials: session.credentials });
    } catch {
      // best-effort — clean up session regardless
    }
    session.client.stop?.();
    sessions.delete(key);
    return text({ message: `Left match ${matchID}` });
  }
);

// ── Prompts ───────────────────────────────────────────────────────────────────

mcp.prompt(
  'autonomous_player',
  'Play the game autonomously — draw cards, write creative cards, react to other players',
  {
    tone: z.enum(['whimsical', 'serious', 'absurdist', 'competitive', 'collaborative']).optional().describe('Writing tone for cards you create'),
    themes: z.string().optional().describe('Comma-separated topic interests, e.g. "sci-fi, puns, local history"'),
    aggression: z.enum(['passive', 'balanced', 'aggressive']).optional().describe('How actively to claim cards and submit new ones'),
  },
  ({ tone, themes, aggression }) => {
    const t = tone ?? 'whimsical';
    const themeList = themes ? themes.split(',').map(s => s.trim()).filter(Boolean) : [];
    const a = aggression ?? 'balanced';
    const themeClause = themeList.length > 0 ? `\nYour thematic interests: ${themeList.join(', ')}. Lean into these when writing cards or choosing which to claim.` : '';

    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `You are an autonomous player in Blank White Cards. Your writing tone is ${t}.${themeClause}

## CRITICAL: Never stop playing

You MUST keep playing indefinitely. Never summarise what you've done. Never ask the user what to do next. Never say "let me know if you want me to continue." You are not having a conversation — you are playing a game in an infinite loop until the process is killed.

After EVERY action, immediately call \`watch\`. After EVERY \`watch\` response (whether it fired or timed out), immediately take an action and call \`watch\` again. There is no end state. Do not stop.

## Play loop

1. Draw cards from the deck with \`pickup_card\` to build your hand.
2. Write new cards with \`submit_card\`, then play them to the pile with \`move_card\`.
3. Call \`watch\` with \`pile: true\` and \`hand: true\`.
4. When \`watch\` fires — react: claim interesting cards, like good ones, write responses.
5. When \`watch\` times out — initiate: draw, write, or play something.
6. GOTO 3. Always.

${ENABLE_IMAGES ? '\n## Card images\n\nIf you have access to an image generation tool, use it to create images for your cards. Get a PNG data URI from the tool, pass it to `compress_image` to convert it to the game format, then include the result as the `image` field in `submit_card`. Cards with images are more engaging.\n' : ''}
## Strategy: ${a}

${a === 'aggressive' ? 'Submit cards frequently. Claim pile cards eagerly. Prioritise getting your cards into play.' : a === 'passive' ? 'Observe more than you act. Like other players\' cards. Only claim or submit when the moment feels right.' : 'Balance between creating and reacting. Claim cards that interest you, submit when the pile is quiet, like cards you genuinely enjoy.'}

Do not narrate. Do not explain. Just play.`,
        },
      }],
    };
  }
);

mcp.prompt(
  'referee',
  'Moderate the game — manage the deck, enforce house rules, keep the game flowing',
  {
    rules: z.string().optional().describe('House rules to enforce, e.g. "no NSFW content, max 3 cards in hand"'),
  },
  ({ rules }) => {
    const ruleBlock = rules ? `\n\n## House rules to enforce\n\n${rules}` : '';

    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `You are a referee/arbiter for Blank White Cards. You do NOT play cards yourself — you manage the game.

## Responsibilities

- Watch for rule violations and announce them (use \`submit_card\` to post a ruling card if needed).
- Shuffle the deck when it runs low (\`shuffle_cards\`, host only).
- Move cards that are misplaced (\`move_card\`).
- Discard cards that violate house rules.
- Keep the game flowing — if no one has acted in a while, draw attention by posting a prompt card.

## How to monitor

Call \`watch\` with all flags (\`pile: true\`, \`hand: true\`, \`table: true\`) to see everything that happens. When an event fires, check if it violates any rules. Re-issue \`watch\` immediately after handling each event.

Use \`search_cards\` and \`get_card\` to inspect specific cards when reviewing content.${ruleBlock}`,
        },
      }],
    };
  }
);

mcp.prompt(
  'spectator',
  'Watch the game and provide commentary without taking game actions',
  {},
  () => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `You are a spectator of Blank White Cards. You observe and comment but do NOT play cards, claim cards, or draw from the deck.

## What you can do

- Use \`get_state\` to see the current game.
- Use \`watch\` with \`pile: true\` to follow the action.
- Use \`get_card\` and \`search_cards\` to read cards in detail.
- Use \`like_card\` to show appreciation for cards you enjoy.
- Provide commentary, narration, or play-by-play to the user.

## What you should NOT do

- Do not call \`pickup_card\`, \`submit_card\`, \`move_card\`, \`claim_card\`, or \`shuffle_cards\`.
- Do not join as a player seat that others need.`,
      },
    }],
  })
);

mcp.prompt(
  'deck_builder',
  'Create and curate card decks — bulk load cards, review content, export finished decks',
  {
    theme: z.string().optional().describe('Theme for the deck being built, e.g. "horror movie tropes"'),
    card_count: z.string().optional().describe('Target number of cards to create'),
  },
  ({ theme, card_count }) => {
    const themeClause = theme ? ` The deck theme is: ${theme}.` : '';
    const countClause = card_count ? ` Target: ${card_count} cards.` : '';

    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `You are building a card deck for Blank White Cards.${themeClause}${countClause}

## Workflow

1. Create a match to use as your workspace.
2. Use \`submit_card\` to write cards one at a time, or \`load_cards\` to bulk-add many at once.
3. Use \`get_state\` and \`search_cards\` to review what you've created.
4. Use \`move_card\` to organise — put finished cards in the deck, works-in-progress in hand, rejects in discard.
5. When done, use \`export_deck\` to get the full card list as JSON.

## Card writing tips

- Each card needs a title (the rule or name) and optionally a description (flavour text or clarification).
- Vary card types: some should be actions, some persistent effects, some jokes, some challenges.
- Cards are more fun when they interact with other cards or change the game state.${ENABLE_IMAGES ? '\n- If you have access to an image generation tool, create images for your cards: get a PNG data URI, pass it to `compress_image`, then include the result as the `image` field in `submit_card`.' : ''}`,
        },
      }],
    };
  }
);

const transport = new StdioServerTransport();
mcp.connect(transport).catch(console.error);
