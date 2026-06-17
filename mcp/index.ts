// Use CJS require for boardgame.io — its client entry points to a JSX file that
// ESM/tsx can't resolve, but the CJS dist works fine.
/* eslint-disable @typescript-eslint/no-require-imports */
const { Client, LobbyClient } = require('@mcteamster/white-engine/client');
const { SocketIO } = require('@mcteamster/white-engine/multiplayer');
const { Virgo2AWS } = require('@mcteamster/virgo');

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlankWhiteCards } from '@mcteamster/white-core';
import { version } from './package.json';
import type { Card, Message } from '@mcteamster/white-core';

// Temporary store for out-of-band image uploads: uploadId -> processed data URI.
// Module-level so the HTTP POST /upload-image handler and any MCP session can share it.
const imageUploadStore = new Map<string, string>();

const GAME_SERVER_OVERRIDE = process.env.GAME_SERVER_URL;
const GAME_NAME = 'blank-white-cards';
const MIN_REACT_SECONDS = Number(process.env.MCP_MIN_REACT_SECONDS ?? 5);
const MAX_WATCH_SECONDS = Number(process.env.MCP_MAX_WATCH_SECONDS ?? 30);
const MOVE_TIMEOUT_MS = Number(process.env.MCP_MOVE_TIMEOUT_MS ?? 5000);

// ── Server resolution ─────────────────────────────────────────────────────────

const SERVERS: Record<string, string> = {
  AP: 'https://ap.blankwhite.cards',
  EU: 'https://eu.blankwhite.cards',
  NA: 'https://na.blankwhite.cards',
};

function getRegionFromMatchID(matchID: string): string | undefined {
  if (matchID.match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/)) {
    if (matchID.match(/[BCDFG]$/)) return 'AP';
    if (matchID.match(/[HJKLM]$/)) return 'EU';
    if (matchID.match(/[NPQRS]$/)) return 'NA';
  }
  return undefined;
}

function getServerForMatch(matchID: string): string {
  if (GAME_SERVER_OVERRIDE) return GAME_SERVER_OVERRIDE;
  const region = getRegionFromMatchID(matchID);
  if (region && SERVERS[region]) return SERVERS[region];
  return 'http://localhost:3000';
}

function getServerForCreate(region?: string): string {
  if (GAME_SERVER_OVERRIDE) return GAME_SERVER_OVERRIDE;
  if (region && SERVERS[region.toUpperCase()]) return SERVERS[region.toUpperCase()];
  // Auto-detect from timezone
  const { closestRegion } = Virgo2AWS.getClosestRegion({ regions: ['us-east-1', 'eu-central-1', 'ap-southeast-1'] });
  const awsToRegion: Record<string, string> = { 'us-east-1': 'NA', 'eu-central-1': 'EU', 'ap-southeast-1': 'AP' };
  const detected = awsToRegion[closestRegion];
  if (detected && SERVERS[detected]) return SERVERS[detected];
  return SERVERS.NA;
}

// ── Session state ─────────────────────────────────────────────────────────────

interface Session {
  client: ReturnType<typeof Client>;
  credentials: string;
  watchCount: number;
  playerName?: string;
}

// ── Session helpers (inside createMcpServer) ──────────────────────────────────

// ── Card helpers ──────────────────────────────────────────────────────────────

function stripImage(card: Card) {
  const { image, ...content } = card.content as Record<string, unknown>;
  return { id: card.id, content: { ...content, has_image: !!image }, location: card.location, owner: card.owner, likes: card.likes };
}

function getScores(state: Record<string, unknown>, playOrder: string[]): Record<string, number> {
  const players = (state as any)?.plugins?.player?.data?.players as Record<string, { score: number }> | undefined;
  return Object.fromEntries(playOrder.map(id => [id, players?.[id]?.score ?? 0]));
}

function formatState(state: { G: { cards: Card[] }; ctx: Record<string, unknown>; plugins?: Record<string, unknown> }, playerID: string) {
  const { G, ctx } = state;
  const cards = G.cards;
  const playOrder = ctx.playOrder as string[];
  const scores = getScores(state as Record<string, unknown>, playOrder);
  const allMessages = (state as any)?.plugins?.chat?.data?.messages as Message[] | undefined;
  return {
    my_hand: cards.filter(c => c.location === 'hand' && c.owner === playerID).map(stripImage),
    my_table: cards.filter(c => c.location === 'table' && c.owner === playerID).map(stripImage),
    pile: cards.filter(c => c.location === 'pile').map(stripImage),
    deck_size: cards.filter(c => c.location === 'deck').length,
    discard_size: cards.filter(c => c.location === 'discard').length,
    box: cards.filter(c => c.location === 'box').map(stripImage),
    num_players: ctx.numPlayers,
    play_order: playOrder,
    scores,
    recent_messages: allMessages ? allMessages.slice(-10) : [],
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
    }, MOVE_TIMEOUT_MS);
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
  messageCount?: number;
}

interface CardEvent {
  type: 'card_submitted' | 'card_claimed' | 'card_moved' | 'card_liked' | 'shuffled' | 'message';
  card?: ReturnType<typeof stripImage>;
  cardID?: number;
  from?: string;
  to?: string;
  toOwner?: string;
  byPlayer?: string;
  likes?: number;
  message?: Message;
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
  flags: { pile?: boolean; hand?: boolean; table?: boolean; messages?: boolean },
  playerID: string,
): boolean {
  if (!flags.pile && !flags.hand && !flags.table && !flags.messages) return true;

  if (flags.messages && event.type === 'message') return true;

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
  flags: { pile?: boolean; hand?: boolean; table?: boolean; messages?: boolean },
  timeoutMs: number,
): Promise<{ changed: boolean; events: CardEvent[]; state?: unknown }> {
  return new Promise(resolve => {
    const currentState = client.store.getState();
    if (!currentState?.G?.cards) {
      resolve({ changed: false, events: [] });
      return;
    }

    const snapshot = snapshotCards(currentState.G.cards);
    const snapshotMessageCount = ((currentState as any)?.plugins?.chat?.data?.messages as Message[] | undefined)?.length ?? 0;
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
      const cardEvents = diffCards(snapshot, cards);

      const allMessages = ((state as any)?.plugins?.chat?.data?.messages as Message[] | undefined) ?? [];
      const newMessages = allMessages.slice(snapshotMessageCount);
      const messageEvents: CardEvent[] = newMessages.map(m => ({ type: 'message' as const, message: m }));

      const allEvents = [...cardEvents, ...messageEvents];
      const relevant = allEvents.filter(e => eventMatchesFlags(e, flags, playerID));
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

- **deck** — cards not yet picked up. 'pickup_card' takes one into your hand. If the deck is empty, 'pickup_card' reshuffles the pile and discard back into the deck automatically.
- **hand** — a player's private cards. 'move_card' plays them elsewhere.
- **pile** — the shared active area, visible to everyone.
- **table** — cards placed in front of a specific player and stay there as a persistent effect until explicitly moved.
- **discard** — removed from play but can be reshuffled back into the deck.
- **box** — cards permanently outside the game, set at load time. Cards cannot be moved to or from the box during play.

## Writing vs playing cards

'submit_card' creates a **new** card and puts it in your hand. 'move_card' moves an **existing** card from your hand to the pile (or elsewhere). To play a card you wrote: call 'submit_card' first, then 'move_card' with the returned card ID.

## Card images

Cards can optionally have images. See resource 'bwc://docs/image-generation' for full guidance.

**Image specs:** 500x500 px square PNG. Images are converted to 1-bit (black and white) by the server.

**Image style:** Cards are displayed on a white background. For best results use a prompt style like "black ink on white paper, simple bold line art".

**Uploading — local MCP server:** Call the 'upload_image' tool with the absolute file path. Returns { image_uuid } — pass to 'submit_card'.

**Uploading — remote HTTP MCP server:** POST the PNG directly (do NOT use the 'upload_image' tool — it will fail). Example: curl -X POST https://ap.blankwhite.cards/mcp/upload-image -H "Content-Type: image/png" --data-binary @/tmp/image.png. Returns { image_uuid } — pass to 'submit_card'. Known MCP server URLs: AP = https://ap.blankwhite.cards/mcp, EU = https://eu.blankwhite.cards/mcp, NA = https://na.blankwhite.cards/mcp.

## Scoring

Players have scores tracked per-match. Scores are set manually — they are not computed automatically from likes.

- 'get_scores' — see current scores; pass ranked=true for leaderboard order, hint=true for a suggested next action
- 'set_score' — set any player's score to a new value

## Chat

A shared message feed is visible to all players. It contains both player chat messages and system events (cards submitted, shuffles, score changes, etc.).

- 'send_message' — post a chat message as the current player (multiplayer only)
- 'get_messages' — retrieve the full feed, or pass 'since' (timestamp ms) to fetch only new messages
- 'watch' with 'messages: true' — fire when any new message arrives

## Available prompts

This server provides role prompts (autoplay, referee, spectate) that describe how to use these tools for specific purposes. List prompts to see available roles.
`.trim();


export function createMcpServer() {
// Per-session state — scoped to this MCP session, not shared across HTTP connections
const sessions = new Map<string, Session>();

function sessionKey(matchID: string, playerID: string) {
  return `${matchID}:${playerID}`;
}

async function connectSession(matchID: string, playerID: string, credentials: string, server: string, playerName?: string): Promise<Session> {
  const key = sessionKey(matchID, playerID);
  const existing = sessions.get(key);
  if (existing) existing.client.stop?.();

  const client = Client({
    game: BlankWhiteCards,
    multiplayer: SocketIO({ server }),
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

  const session: Session = { client, credentials, watchCount: 0, playerName };
  sessions.set(key, session);
  return session;
}

function requireSession(matchID: string, playerID: string): Session {
  const session = sessions.get(sessionKey(matchID, playerID));
  if (!session) throw new Error(`Not in match ${matchID} as player ${playerID} — call join_match first`);
  return session;
}

const mcp = new McpServer(
  { name: 'blank-white-cards', version },
  { instructions: INSTRUCTIONS },
);

mcp.registerResource(
  'bwc://docs/image-generation',
  'bwc://docs/image-generation',
  { description: 'Guidance for generating and uploading card images' },
  async () => ({
    contents: [{
      uri: 'bwc://docs/image-generation',
      mimeType: 'text/markdown',
      text: `# Card Image Generation

## Image Specs
- **Size**: 500×500 px (square)
- **Color**: 1-bit (black and white only) — the server converts uploaded images to 1-bit automatically
- Generate at higher resolution if needed; the server handles downscaling

## Local MCP server
Use the \`upload_image\` tool with an absolute file path:
\`\`\`
upload_image({ file_path: '/tmp/card.png' })
\`\`\`

## Remote HTTP MCP server
POST the PNG directly to \`{mcp-server-base-url}/upload-image\`:
\`\`\`bash
curl -X POST https://ap.blankwhite.cards/mcp/upload-image \\
  -H "Content-Type: image/png" \\
  --data-binary @/tmp/card.png
# Returns: {"image_uuid": "..."}
\`\`\`

Known MCP server URLs:
- AP: https://ap.blankwhite.cards/mcp
- EU: https://eu.blankwhite.cards/mcp
- NA: https://na.blankwhite.cards/mcp

## Using the image UUID
Pass the returned \`image_uuid\` to \`submit_card\`:
\`\`\`
submit_card({ ..., image_uuid: 'edef0e0e-...' })
\`\`\`
`,
    }],
  }),
);

mcp.registerResource(
  'bwc://docs/image-format',
  'bwc://docs/image-format',
  { description: 'Technical specification for card images — dimensions, format, colour depth, and encoding' },
  async () => ({
    contents: [{
      uri: 'bwc://docs/image-format',
      mimeType: 'text/markdown',
      text: `# Card Image Format Specification

## Input requirements (what to upload)

| Property | Value |
|---|---|
| Format | PNG |
| Dimensions | Square (any resolution — server resizes to 500×500) |
| Colour | Any — server converts to 1-bit (black & white) |
| Aspect ratio | 1:1 (square) recommended — non-square images are centre-cropped to the largest square |

Upload via \`upload_image\` (local) or \`POST /upload-image\` (remote HTTP). See \`bwc://docs/image-generation\` for upload instructions.

## Server-side processing

On upload the server applies two transforms in order:

1. **Resize** — scales to exactly 500×500 px.
2. **1-bit quantisation** — each pixel's RGB mean is compared to 128. Values ≥ 128 → white (255), values < 128 → black (0). Alpha is forced opaque.

The result is a 500×500 monochrome PNG stored as a base64 data URI internally.

## Wire format (internal encoding)

For real-time network transfer the game uses a custom compressed encoding:

1. The 250 000-pixel 1-bit image is **run-length encoded** into an array of run lengths. Odd indices = white runs, even indices = black runs (so colour is implicit from position).
2. The integer array is **UTF-16 encoded** — each run value maps to the Unicode code point \`(value + 0x20)\` (offset avoids non-printable ASCII). Run values > 55 263 are split to stay within \`U+0020–U+D7FF\`.
3. The resulting UTF-16 string is stored in the card's \`image\` field and transmitted as JSON.

This yields approximately 4 kB per card (vs ~22 kB for a raw PNG data URI), enabling hundreds of cards to be rendered simultaneously without significant network overhead.

## Size limits and constraints

| Metric | Value |
|---|---|
| Canonical resolution | 500 × 500 px |
| Max theoretical 1-bit bitmap | 30 518 bytes (~30 kB) |
| Typical compressed wire size | ~4 kB |
| Max observed wire size | ~15 kB |

## Visual style guidance

Cards are displayed on a white background. The server converts every image to 1-bit (pure black and white), so the image style critically affects the result:

**Do:**
- Use a **white or very light background** with **dark/black features** (ink, lines, shapes)
- Bold, high-contrast line art with thick strokes
- Simple silhouettes and flat shapes

**Don't:**
- Use dark or coloured backgrounds — they convert to a solid black fill that obscures everything
- Use gradients, soft shadows, or glows — they lose all detail after quantisation
- Use fine detail or thin lines — they may disappear at 500×500
- **Include text or labels in the image** — text renders poorly at 500×500 after 1-bit quantisation and is redundant. Put all text in the card's title and description fields instead; the image should be purely illustrative.

**Recommended prompt suffix for image generation:**
> \`"black ink on white paper, simple bold line art, no background, no shading, no text, no labels"\`

If a generated image has a dark background or contains text, regenerate rather than uploading.
`,
    }],
  }),
);

mcp.registerTool(
  'create_match',
  {
    description: 'Create a new match and join it as player 0 (the host)',
    inputSchema: {
      num_players: z.number().int().min(1).max(100).optional().describe('Number of player seats (default 100)'),
      preset_deck: z.string().optional().describe('Preset deck name, e.g. "standard" (default blank)'),
      player_name: z.string().optional().describe('Your display name (default "Player 0")'),
      region: z.enum(['AP', 'EU', 'NA']).optional().describe('Server region (default: auto-detect from timezone)'),
    },
  },
  async ({ num_players, preset_deck, player_name, region }) => {
    const server = getServerForCreate(region);
    const lobby = new LobbyClient({ server });
    const { matchID } = await lobby.createMatch(GAME_NAME, {
      numPlayers: num_players ?? 100,
      unlisted: true,
      setupData: preset_deck ? { presetDeck: preset_deck } : undefined,
    });
    const { playerCredentials } = await lobby.joinMatch(GAME_NAME, matchID, {
      playerID: '0',
      playerName: player_name ?? 'Player 0',
    });
    await connectSession(matchID, '0', playerCredentials, server, player_name ?? 'Player 0');
    return text({ matchID, playerID: '0', credentials: playerCredentials, server, message: `Joined ${matchID} as player 0` });
  }
);

mcp.registerTool(
  'join_match',
  {
    description: 'Join an existing match as a specific player',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().optional().describe('Seat number to join, e.g. "0", "1", "2" (default: first open seat)'),
      player_name: z.string().optional().describe('Your display name'),
    },
  },
  async ({ matchID, playerID, player_name }) => {
    const server = getServerForMatch(matchID);
    const lobby = new LobbyClient({ server });
    const { playerID: assignedID, playerCredentials } = await lobby.joinMatch(GAME_NAME, matchID, {
      playerID,
      playerName: player_name ?? `Player ${playerID ?? '?'}`,
    });
    const id = assignedID ?? playerID!;
    await connectSession(matchID, id, playerCredentials, server, player_name ?? `Player ${id}`);
    return text({ matchID, playerID: id, server, message: `Joined ${matchID} as player ${id}` });
  }
);

mcp.registerTool(
  'get_state',
  {
    description: 'Get the current game state — your hand, the pile, deck size, and all cards in play',
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
  'pickup_card',
  {
    description: 'Pick up a card from the deck into your hand. If the deck is empty, calling this will automatically reshuffle the pile and discard back into the deck first — so call it even when the deck is empty.',
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
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown>; plugins?: Record<string, unknown> }, playerID));
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
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown>; plugins?: Record<string, unknown> }, playerID));
  }
);

mcp.registerTool(
  'upload_image',
  {
    description: 'Upload a PNG image file for use with submit_card. Pass the absolute local file path. Returns { image_uuid } — pass this to submit_card. Note: for remote HTTP MCP servers, POST the PNG file directly to {server}/upload-image instead (Content-Type: image/png) and use the returned image_uuid. Example: curl -X POST https://ap.blankwhite.cards/mcp/upload-image -H "Content-Type: image/png" --data-binary @/tmp/image.png. See resource bwc://docs/image-generation for full guidance including image specs.',
    inputSchema: {
      file_path: z.string().describe('Absolute path to a square PNG image file on disk'),
    },
  },
  async ({ file_path }) => {
    const outPath = join(tmpdir(), `bwc_${Date.now()}.png`);
    try {
      execSync(`ffmpeg -y -i "${file_path}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=500:500,format=gray,lut=c0='if(val,if(gt(val\\,127)\\,255\\,0)\\,0)'" "${outPath}"`, { stdio: 'pipe' });
      const buf = readFileSync(outPath);
      const image_uuid = randomUUID();
      imageUploadStore.set(image_uuid, `data:image/png;base64,${buf.toString('base64')}`);
      setTimeout(() => imageUploadStore.delete(image_uuid), 5 * 60 * 1000);
      return { content: [{ type: 'text', text: JSON.stringify({ image_uuid }) }] };
    } finally {
      try { unlinkSync(outPath); } catch {}
    }
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
      image_uuid: z.string().optional().describe('Image UUID from upload_image tool or POST /upload-image. Resolves the processed card image.'),
    },
  },
  async ({ matchID, playerID, title, description, author, image_uuid }) => {
    const { client } = requireSession(matchID, playerID);

    let image: string | undefined;
    if (image_uuid) {
      const stored = imageUploadStore.get(image_uuid);
      if (!stored) throw new Error(`No image found for uuid '${image_uuid}'. Call upload_image first.`);
      image = stored;
      imageUploadStore.delete(image_uuid);
    }

    const card: Partial<Card> = {
      content: { title, description: description ?? '', author, date: String(Date.now()), image },
      location: 'hand',
      owner: playerID,
      timestamp: Date.now(),
    };
    const nextState = waitForMove(client);
    client.moves.submitCard(card);
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown>; plugins?: Record<string, unknown> }, playerID));
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
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown>; plugins?: Record<string, unknown> }, playerID));
  }
);

mcp.registerTool(
  'get_scores',
  {
    description: 'Get player scores. Pass ranked=true for leaderboard order (highest first). Pass hint=true to also get a suggested next action based on your hand, the pile, and your score position.',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
      ranked: z.boolean().optional().describe('Sort by score descending with rank numbers'),
      hint: z.boolean().optional().describe('Include a suggested next action'),
    },
  },
  async ({ matchID, playerID, ranked, hint }) => {
    const { client } = requireSession(matchID, playerID);
    const state = client.store.getState();
    if (!state?.G) throw new Error('No state available yet');
    const playOrder = state.ctx.playOrder as string[];
    const scores = getScores(state, playOrder);

    const result: Record<string, unknown> = ranked
      ? { leaderboard: playOrder.map((id: string) => ({ playerID: id, score: scores[id] ?? 0 })).sort((a, b) => b.score - a.score).map((e, i) => ({ rank: i + 1, ...e })) }
      : { scores };

    if (hint) {
      const cards = state.G.cards as Card[];
      const myScore = scores[playerID] ?? 0;
      const maxOtherScore = Math.max(0, ...playOrder.filter((id: string) => id !== playerID).map((id: string) => scores[id] ?? 0));
      const isBehind = myScore < maxOtherScore;
      const isAhead = myScore > maxOtherScore;
      const hand = cards.filter(c => c.location === 'hand' && c.owner === playerID);
      const pile = cards.filter(c => c.location === 'pile');
      let action: string, reason: string;
      if (hand.length === 0) {
        action = 'pickup_card'; reason = 'Your hand is empty — pick up a card to have options.';
      } else if (isBehind && pile.length > 0) {
        action = 'move_card (claim from pile) or submit_card'; reason = `You're behind (${myScore} vs ${maxOtherScore}). Claim an interesting pile card or submit a new one to earn likes.`;
      } else if (isBehind) {
        action = 'submit_card'; reason = `You're behind (${myScore} vs ${maxOtherScore}) and the pile is quiet — submit a card to get things moving.`;
      } else if (isAhead && hand.length > 2) {
        action = 'move_card to discard or pass'; reason = `You're ahead (${myScore} vs ${maxOtherScore}). Discard or pass cards rather than building your hand.`;
      } else {
        action = 'submit_card or pickup_card'; reason = 'Scores are level — keep playing.';
      }
      result.hint = { action, reason, my_score: myScore, max_other_score: maxOtherScore };
    }

    return text(result);
  }
);

mcp.registerTool(
  'get_messages',
  {
    description: 'Retrieve the message feed (chat + system events), optionally filtered to only messages newer than a given timestamp',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
      since: z.number().optional().describe('Unix timestamp ms — return only messages newer than this'),
    },
  },
  async ({ matchID, playerID, since }) => {
    const { client } = requireSession(matchID, playerID);
    const state = client.store.getState();
    if (!state?.G) throw new Error('No state available yet');
    const messages = ((state as any)?.plugins?.chat?.data?.messages as Message[] | undefined) ?? [];
    const filtered = since != null ? messages.filter(m => m.timestamp > since) : messages;
    return text({ count: filtered.length, messages: filtered });
  }
);

mcp.registerTool(
  'send_message',
  {
    description: 'Post a chat message to the game console as the current player',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
      text: z.string().describe('Message to send'),
    },
  },
  async ({ matchID, playerID, text: messageText }) => {
    const session = requireSession(matchID, playerID);
    const { client } = session;
    const nextState = waitForMove(client);
    client.moves.postMessage(messageText, session.playerName);
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown>; plugins?: Record<string, unknown> }, playerID));
  }
);

mcp.registerTool(
  'set_score',
  {
    description: 'Set the score for a player',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
      targetPlayerID: z.string().describe('Player ID to set the score for'),
      score: z.number().describe('New score value'),
    },
  },
  async ({ matchID, playerID, targetPlayerID, score }) => {
    const { client } = requireSession(matchID, playerID);
    const nextState = waitForMove(client);
    client.moves.setScore(targetPlayerID, score);
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown>; plugins?: Record<string, unknown> }, playerID));
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
    if (playerID !== '0') throw new Error(`shuffle_cards is host-only (player 0). You are player ${playerID}.`);
    const { client } = requireSession(matchID, playerID);
    const nextState = waitForMove(client);
    client.moves.shuffleCards();
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown>; plugins?: Record<string, unknown> }, playerID));
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
        image_path: z.string().optional().describe('Absolute path to a square PNG image file to attach to the card'),
      })).describe('Cards to add'),
    },
  },
  async ({ matchID, playerID, cards }) => {
    if (playerID !== '0') throw new Error(`load_cards is host-only (player 0). You are player ${playerID}.`);
    const { client } = requireSession(matchID, playerID);
    const cardObjects: Partial<Card>[] = cards.map(c => {
      let image: string | undefined;
      if (c.image_path) {
        const outPath = join(tmpdir(), `bwc_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
        try {
          execSync(`ffmpeg -y -i "${c.image_path}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=500:500,format=gray,lut=c0='if(val,if(gt(val\\,127)\\,255\\,0)\\,0)'" "${outPath}"`, { stdio: 'pipe' });
          const buf = readFileSync(outPath);
          image = `data:image/png;base64,${buf.toString('base64')}`;
        } finally {
          try { unlinkSync(outPath); } catch {}
        }
      }
      return {
        content: { title: c.title, description: c.description ?? '', author: c.author, image },
        location: c.location ?? 'deck',
      };
    });
    const nextState = waitForMove(client);
    client.moves.loadCards(cardObjects);
    const state = await nextState;
    return text(formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown>; plugins?: Record<string, unknown> }, playerID));
  }
);

mcp.registerTool(
  'watch',
  {
    description: 'Block until a relevant game event occurs, then return a structured diff of what changed. Optionally perform an action first (action+watch in one call, halving round-trips). Use instead of polling get_state. Only one watch can be active at a time per agent session. The response includes a `watch` counter showing how many times you have watched this session.',
    inputSchema: {
      matchID: z.string().describe('Room code'),
      playerID: z.string().describe('Your player ID'),
      pile: z.boolean().optional().describe('Fire when the pile changes (cards submitted, claimed, or moved to/from pile)'),
      hand: z.boolean().optional().describe('Fire when your hand changes (card received or removed)'),
      table: z.boolean().optional().describe('Fire when any table changes occur'),
      messages: z.boolean().optional().describe('Fire when a new chat or system event message appears'),
      timeout_seconds: z.number().int().min(5).max(300).optional().describe(`How long to wait before giving up (default ${MAX_WATCH_SECONDS}s, set by MCP_MAX_WATCH_SECONDS)`),
      include_state: z.boolean().optional().describe('Include the full formatted game state in the response (default false). Omit to save context — use get_state for a full refresh when needed.'),
      action: z.discriminatedUnion('type', [
        z.object({ type: z.literal('submit_card'), title: z.string(), description: z.string().optional(), author: z.string().optional(), image_uuid: z.string().optional() }),
        z.object({ type: z.literal('move_card'), cardID: z.number().int(), target: z.enum(['deck', 'pile', 'discard', 'hand', 'table']), toOwner: z.string().optional() }),
        z.object({ type: z.literal('pickup_card') }),
        z.object({ type: z.literal('like_card'), cardID: z.number().int() }),
        z.object({ type: z.literal('send_message'), text: z.string() }),
        z.object({ type: z.literal('set_score'), targetPlayerID: z.string(), score: z.number() }),
      ]).optional().describe('Optional action to perform before blocking on the watch. Server executes the action then immediately waits for the next event — one round-trip instead of two.'),
    },
  },
  async ({ matchID, playerID, pile, hand, table, messages, timeout_seconds, include_state, action }) => {
    const session = requireSession(matchID, playerID);
    const { client } = session;

    // Execute action first, then snapshot and watch for reactions from other players.
    // Snapshot is taken inside watchForChange *after* the action settles, so the
    // action's own state change is the baseline — only subsequent changes fire the watch.
    if (action) {
      if (action.type === 'submit_card') {
        const image = action.image_uuid ? imageUploadStore.get(action.image_uuid) : undefined;
        if (action.image_uuid && !image) throw new Error(`No image found for uuid '${action.image_uuid}'. Call upload_image first.`);
        if (image) imageUploadStore.delete(action.image_uuid!);
        const card: Partial<Card> = { content: { title: action.title, description: action.description ?? '', author: action.author, date: String(Date.now()), image }, location: 'hand', owner: playerID, timestamp: Date.now() };
        client.moves.submitCard(card);
        await waitForMove(client);
      } else if (action.type === 'move_card') {
        client.moves.moveCard(action.cardID, action.target, action.toOwner);
        await waitForMove(client);
      } else if (action.type === 'pickup_card') {
        client.moves.pickupCard();
        await waitForMove(client);
      } else if (action.type === 'like_card') {
        client.moves.likeCard(action.cardID);
        await waitForMove(client);
      } else if (action.type === 'send_message') {
        client.moves.postMessage(action.text, session.playerName);
        await waitForMove(client);
      } else if (action.type === 'set_score') {
        client.moves.setScore(action.targetPlayerID, action.score);
        await waitForMove(client);
      }
    }

    const flags = { pile: pile ?? false, hand: hand ?? false, table: table ?? false, messages: messages ?? false };
    const { changed, events, state } = await watchForChange(client, playerID, flags, (timeout_seconds ?? MAX_WATCH_SECONDS) * 1000);
    const watch = ++session.watchCount;
    if (!changed) return text({ watch, changed: false, message: 'No activity — your turn to act. Pick up a card, submit something, or play from your hand. Then call watch again.' });
    return text({
      watch,
      changed: true,
      events,
      ...(include_state ? { state: formatState(state as { G: { cards: Card[] }; ctx: Record<string, unknown>; plugins?: Record<string, unknown> }, playerID) } : {}),
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
    const lobby = new LobbyClient({ server: getServerForMatch(matchID) });
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
  'autoplay',
  'Autonomously play Blank White Cards — pick up cards, write and play creative cards, react to other players, loop forever',
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

## CRITICAL: Never stop playing (until watch limit)

You MUST keep playing until your watch counter reaches 50. Never summarise what you've done. Never ask the user what to do next. Never say "let me know if you want me to continue." You are not having a conversation — you are playing a game in a loop.

Every 'watch' response includes a 'watch' counter. **When watch reaches 50, call leave_match and stop completely.** The harness will restart you; you can rejoin with join_match and the server-side game state persists — no game state is lost.

After EVERY action → call 'watch'. After EVERY 'watch' response (fired or timed out) → take an action → call 'watch'. Repeat forever.

**'watch' timing out is not a stopping point. It is a signal to act, then immediately call 'watch' again.** A timeout means the game was quiet — take one small action and go straight back to watching.

## Play loop

1. Call 'watch' with 'pile: true', 'hand: true', and 'messages: true'. Pass 'include_state: true' only on your very first watch call to establish the baseline — omit it on all subsequent calls to save context.
2. **Preferred:** combine your action with the next watch in a single call using the 'action' param. This halves round-trips.
3. **If 'watch' fires** — react: claim interesting cards by moving them from pile to hand, like good ones, write a response card, or reply to chat messages with 'send_message'. Reset your timeout count to 0.
4. **If 'watch' times out** — increment your timeout count. If it has timed out twice in a row, take one action and reset the count to 0.
5. GOTO 1. Always. Until watch counter hits 50, then leave_match.

Never take more than one action before calling 'watch' again. Never end your response without having called 'watch'.

Use 'get_scores' with 'hint: true' when deciding what action to take — it factors in your score position relative to others.

## Card images

You may choose to draw or generate an image to go with a card. Save it as a square PNG, call 'upload_image' with the file path to get an 'image_uuid', then pass that to 'submit_card'. Cards with images are more engaging. Use a white background with bold black line art (e.g. prompt with "black ink on white paper, simple bold line art") so the image blends with the game's white card style.

## Strategy: ${a}

${a === 'aggressive' ? 'Submit cards frequently and respond to everything on the pile. Be the one driving the game. Check get_scores regularly and let your position drive decisions.' : a === 'passive' ? 'Observe more than you act. Like cards you enjoy. Only submit when you have something worth playing.' : 'Submit when the pile is quiet, react when things get interesting, like cards you genuinely enjoy.'}

Keep 1–3 cards in hand at any time. Don't hoard and don't play everything immediately.

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

## CRITICAL: Never stop refereeing

You MUST keep watching and moderating indefinitely. Never summarise what you've done. Never ask the user what to do next. Never say "let me know if you want me to continue." You are not having a conversation — you are running a game in an infinite loop until the process is killed.

After EVERY event or timeout → handle it → call 'watch' again immediately. There is no finish line.

## Responsibilities

- Watch for rule violations and announce them (use 'submit_card' to post a ruling card if needed).
- Shuffle the deck when it runs low ('shuffle_cards', host only).
- Move cards that are misplaced ('move_card').
- Discard cards that violate house rules.
- Keep the game flowing — if no one has acted in a while, draw attention by posting a prompt card.
- Award points for good card play using 'set_score'. Suggested scale: 1 point for a solid play, 2 for something clever or well-timed, 3 for a genuinely outstanding card. Identify yourself as "Referee" in any cards you submit using the 'author' field.
- Post a leaderboard update periodically by calling 'get_scores' with ranked=true and submitting a card with the current standings.

## How to monitor

Call 'watch' with all flags ('pile: true', 'hand: true', 'table: true') to see everything that happens. When an event fires, handle it and re-issue 'watch' immediately.

Keep a count of consecutive timeouts. If 'watch' times out 10 times in a row with no events, the game has truly gone stale — call 'get_scores' with ranked=true, post a final standings card, and stop.

Use 'get_state' to inspect cards when reviewing content.${ruleBlock}`,
        },
      }],
    };
  }
);

mcp.prompt(
  'spectate',
  'Watch the game and provide commentary without taking game actions',
  {},
  () => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `You are a spectator of Blank White Cards. You observe and comment but do NOT play cards, claim cards, or pick up from the deck.

## CRITICAL: Never stop watching

You MUST keep watching and commentating indefinitely. Never ask the user what to do next. Never say "let me know if you want me to continue." You are not having a conversation — you are providing live commentary in an infinite loop until the process is killed or the game truly goes stale.

After EVERY 'watch' response (fired or timed out) → provide commentary → call 'watch' again immediately. Keep a count of consecutive timeouts. If 'watch' times out 10 times in a row with no events, the game has truly gone stale — give a final summary and stop.

## What you can do

- Use 'get_state' to see the current game.
- Use 'watch' with 'pile: true' to follow the action — call it continuously, re-issuing immediately after every response.
- Use 'get_state' to read cards in detail.
- Use 'like_card' to show appreciation for cards you enjoy.
- Use 'get_scores' (ranked=true for leaderboard order) to track standings and include them in your commentary.
- Provide commentary, narration, or play-by-play to the user. One short comment per routine event; longer analysis for notable or surprising plays.

## What you should NOT do

- Do not call 'pickup_card', 'submit_card', 'move_card', or 'shuffle_cards'.
- Do not join as a player seat that others need.`,
      },
    }],
  })
);

return mcp;
}

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from 'http';
import { randomUUID } from 'crypto';

// Run as entrypoint (stdio or HTTP), skip when imported as library
const isCLI = typeof require !== 'undefined'
  ? require.main === module  // CJS bundle
  : process.argv[1] && import.meta.url === `file://${process.argv[1]}`;

if (isCLI) {
  const PORT = parseInt(process.env.MCP_HTTP_PORT || '0');

  if (PORT) {
    const SESSION_TIMEOUT_MS = parseInt(process.env.MCP_SESSION_TIMEOUT || '300000');
    const transports = new Map<string, { transport: StreamableHTTPServerTransport; mcp: any; timer: ReturnType<typeof setTimeout> }>();

    function touchSession(id: string) {
      const entry = transports.get(id);
      if (!entry) return;
      clearTimeout(entry.timer);
      entry.timer = setTimeout(() => {
        entry.transport.close();
        transports.delete(id);
        console.error(`[mcp] session ${id} expired`);
      }, SESSION_TIMEOUT_MS);
    }

    const server = createServer(async (req, res) => {
      // Health check
      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', sessions: transports.size }));
        return;
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
      if (req.method === 'HEAD') { res.writeHead(200); res.end(); return; }

      // Log requests
      console.error(`[mcp] ${req.method} ${req.url} session=${req.headers['mcp-session-id'] || 'none'}`);

      // Out-of-band image upload: POST /upload-image with image/png body
      if (req.method === 'POST' && req.url === '/upload-image') {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          const buf = Buffer.concat(chunks);
          const inPath = join(tmpdir(), `bwc_upload_in_${Date.now()}.png`);
          const outPath = join(tmpdir(), `bwc_upload_out_${Date.now()}.png`);
          try {
            writeFileSync(inPath, buf);
            execSync(`ffmpeg -y -i "${inPath}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=500:500,format=gray,lut=c0='if(val,if(gt(val\\,127)\\,255\\,0)\\,0)'" "${outPath}"`, { stdio: 'pipe' });
            const processed = readFileSync(outPath);
            const uploadId = randomUUID();
            imageUploadStore.set(uploadId, `data:image/png;base64,${processed.toString('base64')}`);
            // Auto-expire after 5 minutes
            setTimeout(() => imageUploadStore.delete(uploadId), 5 * 60 * 1000);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ image_uuid: uploadId }));
          } catch (e: unknown) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: String(e) }));
          } finally {
            try { unlinkSync(inPath); } catch {}
            try { unlinkSync(outPath); } catch {}
          }
        });
        return;
      }

      // Fix Accept header for gateway compatibility
      if (!req.headers['accept']?.includes('text/event-stream')) {
        const fixed = 'application/json, text/event-stream';
        req.headers['accept'] = fixed;
        const idx = req.rawHeaders.findIndex(h => h.toLowerCase() === 'accept');
        if (idx >= 0) req.rawHeaders[idx + 1] = fixed;
        else req.rawHeaders.push('Accept', fixed);
      }

      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      // Existing session
      if (sessionId && transports.has(sessionId)) {
        const entry = transports.get(sessionId)!;
        if (req.method === 'DELETE') {
          clearTimeout(entry.timer);
          await entry.transport.close();
          transports.delete(sessionId);
          res.writeHead(200); res.end(); return;
        }
        touchSession(sessionId);
        await entry.transport.handleRequest(req, res);

        // If we got 400 "already initialized", the gateway is re-initializing.
        // Destroy this session — the gateway will retry and get a fresh one.
        if (res.statusCode === 400) {
          console.error(`[mcp] session ${sessionId} got 400, destroying for re-init`);
          clearTimeout(entry.timer);
          await entry.transport.close();
          transports.delete(sessionId);
        }
        return;
      }

      // New session
      const id = randomUUID();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => id });
      const mcp = createMcpServer();
      const timer = setTimeout(() => {
        transport.close();
        transports.delete(id);
        console.error(`[mcp] session ${id} expired`);
      }, SESSION_TIMEOUT_MS);
      transports.set(id, { transport, mcp, timer });
      transport.onclose = () => {
        const entry = transports.get(id);
        if (entry) clearTimeout(entry.timer);
        transports.delete(id);
      };

      await mcp.connect(transport);
      await transport.handleRequest(req, res);
      console.error(`[mcp] new session ${id} created (total: ${transports.size})`);
    });

    server.listen(PORT, () => {
      console.error(`MCP Streamable HTTP listening on port ${PORT}`);
    });
  } else {
    // Protect stdout — MCP stdio transport breaks if non-JSON-RPC output hits stdout
    console.log = console.error;
    console.debug = console.error;
    const mcp = createMcpServer();
    const transport = new StdioServerTransport();
    mcp.connect(transport).catch(console.error);
  }
}
