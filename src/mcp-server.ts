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

// ── Session state ─────────────────────────────────────────────────────────────

interface Session {
  client: ReturnType<typeof Client>;
  credentials: string;
}
const sessions = new Map<string, Session>();

// ── Persona / strategy state ──────────────────────────────────────────────────

interface Persona {
  tone: 'whimsical' | 'serious' | 'absurdist' | 'competitive' | 'collaborative';
  themes: string[];
  verbosity: 'terse' | 'normal' | 'verbose';
}

interface Strategy {
  aggression: 'passive' | 'balanced' | 'aggressive';
  generosity: 'selfish' | 'balanced' | 'generous';
  hand_size_target: number;
}

const personas = new Map<string, Persona>();
const strategies = new Map<string, Strategy>();

const DEFAULT_PERSONA: Persona = { tone: 'whimsical', themes: [], verbosity: 'normal' };
const DEFAULT_STRATEGY: Strategy = { aggression: 'balanced', generosity: 'balanced', hand_size_target: 3 };

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
      if (relevant.length > 0) done({ changed: true, events: relevant, state });
    });

    if (settled) unsub?.();
  });
}

// ── Play hint ─────────────────────────────────────────────────────────────────

type FormattedState = ReturnType<typeof formatState>;
type StrippedCard = ReturnType<typeof stripImage>;

function generateHint(
  state: FormattedState,
  persona: Persona,
  strategy: Strategy,
): { action: string; cardID?: number; reason: string; suggested_title?: string } {
  const { my_hand, pile, deck_size } = state;
  const { aggression, generosity, hand_size_target } = strategy;
  const { tone, themes, verbosity } = persona;

  const themeMatch = themes.length > 0
    ? pile.find((c: StrippedCard) => {
        const title = (c.content as { title?: string }).title ?? '';
        const desc = (c.content as { description?: string }).description ?? '';
        return themes.some(t => title.toLowerCase().includes(t.toLowerCase()) || desc.toLowerCase().includes(t.toLowerCase()));
      })
    : null;

  const verbosityHint = verbosity === 'terse' ? ' Keep it brief.' : verbosity === 'verbose' ? ' Be elaborate and descriptive.' : '';
  const themeClause = themes.length > 0 ? ` about one of these themes: ${themes.join(', ')}` : '';
  const suggestedTitle = `Write a ${tone} card${themeClause}.${verbosityHint}`;

  if (my_hand.length < hand_size_target) {
    if (themeMatch) {
      return { action: 'claim_card', cardID: themeMatch.id, reason: `Pile card ${themeMatch.id} matches your themes — claim it` };
    }
    if (pile.length > 0 && aggression !== 'passive') {
      const mostLiked = (pile as StrippedCard[]).reduce((best, c) => ((c.likes ?? 0) > (best.likes ?? 0) ? c : best), pile[0]);
      return { action: 'claim_card', cardID: mostLiked.id, reason: 'Hand below target — claiming most-liked pile card' };
    }
    if (deck_size > 0) {
      return { action: 'pickup_card', reason: `Hand (${my_hand.length}) below target (${hand_size_target})` };
    }
    return { action: 'wait', reason: 'No cards available to draw' };
  }

  if (aggression === 'aggressive') {
    return { action: 'submit_card', suggested_title: suggestedTitle, reason: 'Aggressive play — submit a new card to earn likes' };
  }

  if (aggression === 'balanced') {
    if (pile.length > 0) {
      const toLike = (pile as StrippedCard[]).find(c => !c.likes) ?? pile[0];
      return { action: 'like_card', cardID: toLike.id, reason: 'Engaging with the pile — like a card that has no likes yet' };
    }
    return { action: 'submit_card', suggested_title: suggestedTitle, reason: 'Hand full and pile is empty — contribute a card' };
  }

  // passive
  if (generosity === 'generous' && my_hand.length > 1) {
    return { action: 'move_card', cardID: my_hand[0].id, reason: 'Generous play — pass a card to the pile for others' };
  }

  return { action: 'wait', reason: 'Passive strategy — watch for changes before acting' };
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
  'get_card',
  'Get a single card by ID from the current match state',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
    cardID: z.number().int().describe('ID of the card to retrieve'),
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

mcp.tool(
  'search_cards',
  'Full-text search over card titles and descriptions in the current match',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
    query: z.string().describe('Search term (case-insensitive, matches title or description)'),
    location: z.enum(['deck', 'pile', 'discard', 'hand', 'table', 'box']).optional().describe('Restrict search to a specific location (default: all)'),
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

mcp.tool(
  'export_deck',
  'Export all cards in a match as JSON (wraps the server /export/:matchID endpoint)',
  {
    matchID: z.string().describe('Room code'),
  },
  async ({ matchID }) => {
    const res = await fetch(`${GAME_SERVER}/export/${matchID}`);
    if (!res.ok) throw new Error(`Export failed: ${res.status} ${res.statusText}`);
    const encoded = await res.text();
    const cards = JSON.parse(decodeURI(atob(encoded)));
    return text({ matchID, count: cards.length, cards });
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
  'Write a new card into your hand. Use move_card to play it to the pile when ready.',
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
      content: { title, description: description ?? '', author, date: String(Date.now()) },
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
  'watch',
  'Block until a relevant game event occurs, then return a structured diff of what changed. Use instead of polling get_state. Only one watch can be active at a time per agent session.',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
    pile: z.boolean().optional().describe('Fire when the pile changes (cards submitted, claimed, or moved to/from pile)'),
    hand: z.boolean().optional().describe('Fire when your hand changes (card received or removed)'),
    table: z.boolean().optional().describe('Fire when any table changes occur'),
    timeout_seconds: z.number().int().min(5).max(120).optional().describe('How long to wait before giving up (default 30s)'),
  },
  async ({ matchID, playerID, pile, hand, table, timeout_seconds }) => {
    const { client } = requireSession(matchID, playerID);
    const flags = { pile: pile ?? false, hand: hand ?? false, table: table ?? false };
    const { changed, events, state } = await watchForChange(client, playerID, flags, (timeout_seconds ?? 30) * 1000);
    if (!changed) return text({ changed: false, message: 'No matching event within timeout' });
    return text({
      changed: true,
      events,
      state: formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown> }, playerID),
    });
  }
);

mcp.tool(
  'set_persona',
  'Configure the writing personality for this session. Persists until changed or the MCP server restarts.',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
    tone: z.enum(['whimsical', 'serious', 'absurdist', 'competitive', 'collaborative']).optional().describe('Overall writing tone'),
    themes: z.array(z.string()).optional().describe('Topic interests that shape card writing, e.g. ["sci-fi", "puns", "local history"]'),
    verbosity: z.enum(['terse', 'normal', 'verbose']).optional().describe('How much to write on each card'),
  },
  async ({ matchID, playerID, tone, themes, verbosity }) => {
    const key = sessionKey(matchID, playerID);
    const current = personas.get(key) ?? { ...DEFAULT_PERSONA };
    const updated: Persona = {
      tone: tone ?? current.tone,
      themes: themes ?? current.themes,
      verbosity: verbosity ?? current.verbosity,
    };
    personas.set(key, updated);
    return text(updated);
  }
);

mcp.tool(
  'get_persona',
  'Read the current writing persona for this session',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
  },
  async ({ matchID, playerID }) => {
    return text(personas.get(sessionKey(matchID, playerID)) ?? DEFAULT_PERSONA);
  }
);

mcp.tool(
  'set_strategy',
  'Configure play behaviour for this session. Persists until changed or the MCP server restarts.',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
    aggression: z.enum(['passive', 'balanced', 'aggressive']).optional().describe('How readily to claim cards and submit new ones'),
    generosity: z.enum(['selfish', 'balanced', 'generous']).optional().describe('Tendency to pass cards to others vs hold them'),
    hand_size_target: z.number().int().min(0).max(20).optional().describe('Preferred number of cards to keep in hand'),
  },
  async ({ matchID, playerID, aggression, generosity, hand_size_target }) => {
    const key = sessionKey(matchID, playerID);
    const current = strategies.get(key) ?? { ...DEFAULT_STRATEGY };
    const updated: Strategy = {
      aggression: aggression ?? current.aggression,
      generosity: generosity ?? current.generosity,
      hand_size_target: hand_size_target ?? current.hand_size_target,
    };
    strategies.set(key, updated);
    return text(updated);
  }
);

mcp.tool(
  'get_strategy',
  'Read the current play strategy for this session',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
  },
  async ({ matchID, playerID }) => {
    return text(strategies.get(sessionKey(matchID, playerID)) ?? DEFAULT_STRATEGY);
  }
);

mcp.tool(
  'get_play_hint',
  'Get a suggested next action based on the current game state, persona, and strategy. Use this when unsure what to do next.',
  {
    matchID: z.string().describe('Room code'),
    playerID: z.string().describe('Your player ID'),
  },
  async ({ matchID, playerID }) => {
    const { client } = requireSession(matchID, playerID);
    const state = client.store.getState();
    if (!state?.G) throw new Error('No state available yet');
    const key = sessionKey(matchID, playerID);
    const persona = personas.get(key) ?? DEFAULT_PERSONA;
    const strategy = strategies.get(key) ?? DEFAULT_STRATEGY;
    const formatted = formatState(state, playerID);
    const hint = generateHint(formatted, persona, strategy);
    return text({ persona, strategy, hint });
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
    personas.delete(key);
    strategies.delete(key);
    return text({ message: `Left match ${matchID}` });
  }
);

const transport = new StdioServerTransport();
mcp.connect(transport).catch(console.error);
