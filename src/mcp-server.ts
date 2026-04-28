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
import { BlankWhiteCards } from './Game';
import type { Card } from './Cards';

const GAME_SERVER = process.env.GAME_SERVER_URL ?? 'http://localhost:3000';
const GAME_NAME = 'blank-white-cards';

// Active player sessions keyed by "matchID:playerID"
interface Session {
  client: ReturnType<typeof Client>;
  credentials: string;
}
const sessions = new Map<string, Session>();

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

// Strip image data so state responses are readable — image RLE/PNGs are useless to an AI player
function stripImage(card: Card) {
  const { image: _image, ...content } = card.content as Record<string, unknown>;
  return { id: card.id, content, location: card.location, owner: card.owner, likes: card.likes };
}

// Format game state into a readable summary for the AI
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
// The boardgame.io subscribe fires multiple times during connection handshake,
// making "skip N callbacks" fragile — a fixed wait is simpler and reliable.
function waitForMove(client: ReturnType<typeof Client>): Promise<unknown> {
  return new Promise(resolve => setTimeout(() => resolve(client.store.getState()), 1000));
}

// Block until game state differs from the provided snapshot, or until timeout.
function waitForStateChange(
  client: ReturnType<typeof Client>,
  snapshot: { deckSize: number; pileSize: number; discardSize: number; handSize: number },
  timeoutMs: number,
): Promise<{ changed: boolean; state: unknown }> {
  return new Promise(resolve => {
    let unsub: (() => void) | undefined;
    let settled = false;

    const done = (result: { changed: boolean; state: unknown }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsub?.();
    resolve(result);
    };

    const timer = setTimeout(() => {
      done({ changed: false, state: client.store.getState() });
    }, timeoutMs);

    unsub = client.subscribe((state: unknown) => {
      if (!state || !(state as { G?: { cards?: unknown[] } }).G?.cards) return;
      const G = (state as { G: { cards: Array<{ location: string; owner?: string }> } }).G;
      const deckSize = G.cards.filter(c => c.location === 'deck').length;
      const pileSize = G.cards.filter(c => c.location === 'pile').length;
      const discardSize = G.cards.filter(c => c.location === 'discard').length;
      const handSize = G.cards.filter(c => c.location === 'hand').length;
      if (
        deckSize !== snapshot.deckSize ||
        pileSize !== snapshot.pileSize ||
        discardSize !== snapshot.discardSize ||
        handSize !== snapshot.handSize
      ) {
        done({ changed: true, state });
      }
    });
    // Callback may have fired synchronously and already settled — unsub immediately if so
    if (settled) unsub?.();
  });
}

// ── MCP Server ────────────────────────────────────────────────────────────────

const mcp = new McpServer({ name: 'blank-white-cards', version: '2.0.0' });

mcp.tool(
  'list_matches',
  'List all active Blank White Cards matches',
  {},
  async () => {
    const lobby = new LobbyClient({ server: GAME_SERVER });
    const { matches } = await lobby.listMatches(GAME_NAME);
    return text(matches);
  }
);

mcp.tool(
  'create_match',
  'Create a new match and join it as player 0 (the host)',
  {
    num_players: z.number().int().min(1).max(100).optional().describe('Number of player seats (default 100)'),
    preset_deck: z.string().optional().describe('Preset deck name, e.g. "standard" (default blank)'),
    player_name: z.string().optional().describe('Your display name (default "Player 0")'),
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

mcp.tool(
  'join_match',
  'Join an existing match as a specific player',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Seat number to join, e.g. "0", "1", "2"'),
    player_name: z.string().optional().describe('Your display name'),
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

mcp.tool(
  'get_state',
  'Get the current game state — your hand, the pile, deck size, all cards on the table',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
  },
  async ({ matchID, playerID }) => {
    const { client } = requireSession(matchID, playerID);
    const state = client.store.getState();
    if (!state?.G) throw new Error('No state available yet');
    return text(formatState(state, playerID));
  }
);

mcp.tool(
  'pickup_card',
  'Draw a card from the deck into your hand',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
  },
  async ({ matchID, playerID }) => {
    const { client } = requireSession(matchID, playerID);
    const nextState = waitForMove(client);
    client.moves.pickupCard();
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID));
  }
);

mcp.tool(
  'move_card',
  'Move a card to a different location. Locations: deck, pile, discard, hand, table. Use "hand" with toOwner to pass a card to another player.',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
    cardID: z.number().int().describe('ID of the card to move'),
    target: z.enum(['deck', 'pile', 'discard', 'hand', 'table']).describe('Destination location'),
    toOwner: z.string().optional().describe('Player ID to give the card to (only for hand/table)'),
  },
  async ({ matchID, playerID, cardID, target, toOwner }) => {
    const { client } = requireSession(matchID, playerID);
    const nextState = waitForMove(client);
    client.moves.moveCard(cardID, target, toOwner);
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID));
  }
);

mcp.tool(
  'claim_card',
  'Claim a card from the shared pile into your hand',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
    cardID: z.number().int().describe('ID of the pile card to claim'),
  },
  async ({ matchID, playerID, cardID }) => {
    const { client } = requireSession(matchID, playerID);
    const nextState = waitForMove(client);
    client.moves.claimCard(cardID);
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID));
  }
);

mcp.tool(
  'submit_card',
  'Write a new card and add it to the game. The card goes to the pile so everyone can see it.',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
    title: z.string().describe('Card title / rule text'),
    description: z.string().optional().describe('Additional description or flavour text'),
    author: z.string().optional().describe('Author name to attribute on the card'),
  },
  async ({ matchID, playerID, title, description, author }) => {
    const { client } = requireSession(matchID, playerID);
    const card: Partial<Card> = {
      content: { title, description: description ?? '', author },
      location: 'pile',
      owner: undefined,
    };
    const nextState = waitForMove(client);
    client.moves.submitCard(card);
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID));
  }
);

mcp.tool(
  'like_card',
  'Like a card to show appreciation',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
    cardID: z.number().int().describe('ID of the card to like'),
  },
  async ({ matchID, playerID, cardID }) => {
    const { client } = requireSession(matchID, playerID);
    const nextState = waitForMove(client);
    client.moves.likeCard(cardID);
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID));
  }
);

mcp.tool(
  'shuffle_cards',
  'Reset all cards back to the deck and shuffle (host / player 0 only)',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID (must be 0)'),
  },
  async ({ matchID, playerID }) => {
    const { client } = requireSession(matchID, playerID);
    const nextState = waitForMove(client);
    client.moves.shuffleCards();
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID));
  }
);

mcp.tool(
  'load_cards',
  'Bulk load a set of cards into the match (host / player 0 only)',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID (must be 0)'),
    cards: z.array(z.object({
      title: z.string(),
      description: z.string().optional(),
      author: z.string().optional(),
      location: z.enum(['deck', 'pile', 'discard']).optional(),
    })).describe('Cards to add'),
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

mcp.tool(
  'wait_for_change',
  'Block until the game state changes (cards move between deck/pile/discard/hand), then return the new state. Use this instead of polling get_state.',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
    current_deck_size: z.number().int().describe('Current deck size to compare against'),
    current_pile_size: z.number().int().describe('Current pile size to compare against'),
    current_discard_size: z.number().int().describe('Current discard pile size to compare against'),
    current_hand_size: z.number().int().describe('Current total cards in all hands to compare against'),
    timeout_seconds: z.number().int().min(5).max(120).optional().describe('How long to wait before giving up (default 30s)'),
  },
  async ({ matchID, playerID, current_deck_size, current_pile_size, current_discard_size, current_hand_size, timeout_seconds }) => {
    const { client } = requireSession(matchID, playerID);
    const snapshot = {
      deckSize: current_deck_size,
      pileSize: current_pile_size,
      discardSize: current_discard_size,
      handSize: current_hand_size,
    };
    const { changed, state } = await waitForStateChange(client, snapshot, (timeout_seconds ?? 30) * 1000);
    if (!changed) return text({ changed: false, message: 'No change within timeout' });
    return text({ changed: true, ...formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID) });
  }
);

mcp.tool(
  'leave_match',
  'Leave a match and clean up the local session',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
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

const transport = new StdioServerTransport();
mcp.connect(transport).catch(console.error);
