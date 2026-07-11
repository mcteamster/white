import { Server, Origins } from '@mcteamster/white-engine/server';
import { BlankWhiteCards, presetDecks } from '@mcteamster/white-core';
import { loadPresets } from './src/presets';
import { customAlphabet, nanoid } from 'nanoid';

// Custom alphabet for room codes
const roomCodeGen = () => {
  let roomCode = customAlphabet('BCDFGHJKLMNPQRSTVWXZ', 3)()

  // Regional Partitioning
  if (process.env.REGION == 'AP') {
    roomCode += customAlphabet('BCDFG', 1)() // First quarter for Asia Pacific
  } else if (process.env.REGION == 'EU') {
    roomCode += customAlphabet('HJKLM', 1)() // Second quarter for Europe
  } else if (process.env.REGION == 'NA') {
    roomCode += customAlphabet('NPQRS', 1)() // Third quarter for North America
  } else { 
    roomCode += customAlphabet('TVWXZ', 1)() // Last quarter reserved for fallback and local development
  }

  return roomCode
};

// CORS Configuration
// Deployed servers: set ORIGIN to restrict (e.g. 'https://blankwhite.cards')
// Self-hosted: leave unset for permissive CORS (allows any origin)
const corsOrigin = process.env.ORIGIN;
const origins = corsOrigin
  ? [corsOrigin, Origins.LOCALHOST]
  : [/.*/]; // Allow all origins when not configured (self-hosted default)

// Initialise Server
const server = Server({
  games: [BlankWhiteCards],
  origins,
  uuid: roomCodeGen,
  generateCredentials: () => nanoid(),
});

// Add deck export endpoint
server.router.get('/export/:matchID', async (ctx) => {
  try {
    const { matchID } = ctx.params;
    const { state } = await server.db.fetch(matchID, { state: true });
    
    if (!state || !state.G || !state.G.cards) {
      ctx.status = 404;
      ctx.body = { error: 'Match not found or no cards' };
      return;
    }

    const strippedCards = state.G.cards.map((card: any) => ({
      id: card.id,
      content: card.content,
      location: (card.location === 'box') ? 'box' : 'deck',
      likes: (card?.likes && card.likes > 0 && card.likes < 1_000_000_000) ? card.likes : undefined,
    }));

    const rawData = btoa(encodeURI(JSON.stringify(strippedCards)));
    
    console.log(`Deck exported: ${matchID} (${strippedCards.length} cards)`);
    
    ctx.set('Content-Type', 'text/plain');
    ctx.body = rawData;
  } catch (error) {
    console.error('Deck export failed:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to export deck' };
  }
});

// Presets endpoint — returns available preset decks with metadata
server.router.get('/presets', (ctx) => {
  const presets = presetConfig.map(({ key, name, description, icon }) => {
    const cards = presetDecks[key]?.cards?.length ?? 0;
    return {
      key,
      name,
      description: description.replace('${cards}', String(cards)),
      icon,
      cards,
    };
  });
  ctx.body = { presets };
});

server.run(Number(process.env.PORT));
const presetConfig = loadPresets(process.env.PRESETS_CONFIG || './presets.json');

// Cleanup rooms older than 12 hours
setInterval(async () => {
  const matches = await server.db.listMatches({ gameName: 'blank-white-cards' });
  const now = Date.now();
  const maxAge = 12 * 60 * 60 * 1000;

  for (const matchID of matches) {
    const { metadata } = await server.db.fetch(matchID, { metadata: true });
    const created = new Date(metadata.createdAt).getTime();
    
    if (now - created > maxAge) {
      await server.db.wipe(matchID);
      console.log(`Cleaned up room: ${matchID}`);
    }
  }
}, 60 * 60 * 1000); // Run every hour

process.on('SIGTERM', () => {
  console.error("Exiting due to SIGTERM");
  process.exit(1);
})