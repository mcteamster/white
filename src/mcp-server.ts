import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const GAME_SERVER = process.env.GAME_SERVER_URL ?? 'http://localhost:3000';
const GAME_NAME = 'blank-white-cards';

async function getJSON(url: string) {
  const res = await fetch(url);
  if (res.status === 404) throw new Error('Not found');
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function postJSON(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 404) throw new Error('Not found');
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function text(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

const mcp = new McpServer({ name: 'blank-white-cards', version: '1.0.0' });

mcp.tool(
  'list_matches',
  'List all active Blank White Cards matches with player counts and creation times',
  {},
  async () => {
    const data = await getJSON(`${GAME_SERVER}/games/${GAME_NAME}`);
    return text(data.matches ?? []);
  }
);

mcp.tool(
  'get_match',
  'Get the full game state for a match — all cards with locations, owners, content, and images',
  { matchID: z.string().describe('Room code (e.g. ABCD)') },
  async ({ matchID }) => {
    const state = await getJSON(`${GAME_SERVER}/state/${matchID}`);
    return text(state);
  }
);

mcp.tool(
  'get_card',
  'Get a single card from a match by its numeric ID',
  {
    matchID: z.string().describe('Room code'),
    cardID: z.number().int().describe('Card ID'),
  },
  async ({ matchID, cardID }) => {
    const state = await getJSON(`${GAME_SERVER}/state/${matchID}`);
    const card = (state.cards as Array<{ id: number }>).find(c => c.id === cardID);
    if (!card) throw new Error(`Card ${cardID} not found in match ${matchID}`);
    return text(card);
  }
);

mcp.tool(
  'export_deck',
  'Export all cards in a match as a clean JSON array (id, content, location, likes)',
  { matchID: z.string().describe('Room code') },
  async ({ matchID }) => {
    const state = await getJSON(`${GAME_SERVER}/state/${matchID}`);
    const cards = (state.cards as Array<Record<string, unknown>>).map(card => ({
      id: card.id,
      content: card.content,
      location: card.location === 'box' ? 'box' : 'deck',
      ...(typeof card.likes === 'number' && card.likes > 0 ? { likes: card.likes } : {}),
    }));
    return text(cards);
  }
);

mcp.tool(
  'create_card',
  'Add a new card to a match',
  {
    matchID: z.string().describe('Room code'),
    title: z.string().describe('Card title'),
    description: z.string().optional().describe('Card body text'),
    location: z.enum(['deck', 'pile', 'discard']).optional().describe('Starting location (default: deck)'),
  },
  async ({ matchID, title, description, location }) => {
    const card = await postJSON(`${GAME_SERVER}/card/${matchID}`, {
      content: { title, description: description ?? '' },
      location: location ?? 'deck',
    });
    return text(card);
  }
);

mcp.tool(
  'search_cards',
  'Search all cards in a match by title or description text (case-insensitive)',
  {
    matchID: z.string().describe('Room code'),
    query: z.string().describe('Search terms'),
  },
  async ({ matchID, query }) => {
    const state = await getJSON(`${GAME_SERVER}/state/${matchID}`);
    const q = query.toLowerCase();
    const results = (state.cards as Array<{ content?: { title?: string; description?: string } }>).filter(card => {
      const title = card.content?.title?.toLowerCase() ?? '';
      const desc = card.content?.description?.toLowerCase() ?? '';
      return title.includes(q) || desc.includes(q);
    });
    return text(results);
  }
);

const transport = new StdioServerTransport();
mcp.connect(transport).catch(console.error);
