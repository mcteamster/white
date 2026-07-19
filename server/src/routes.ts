import type { Server } from '@mcteamster/white-engine/server';
import { presetDecks } from '@mcteamster/white-core';
import { loadPresets } from './presets';

type ServerInstance = ReturnType<typeof Server>;

export function registerRoutes(server: ServerInstance) {
  const presetConfig = loadPresets(process.env.PRESETS_CONFIG || './src/presets.json');

  // Deck export endpoint
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

      const strippedRules = (state.G.rules && state.G.rules.length > 0)
        ? state.G.rules.map((r: any) => ({ id: r.id, text: r.text, timestamp: r.timestamp }))
        : undefined;

      const deckObj: { cards: typeof strippedCards, rules?: typeof strippedRules } = { cards: strippedCards };
      if (strippedRules) deckObj.rules = strippedRules;

      const rawData = btoa(encodeURI(JSON.stringify(deckObj)));

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
}
