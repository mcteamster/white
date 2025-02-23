import { GameState } from "../Game";

// Config Constants
export const ORIGIN = 'https://white.mcteamster.com';

// Preload Preset Decks
export const presetDecks: {[key: string]: GameState} = {
  global: { cards: [] },
  standard: { cards: [] },
}

const refreshDeck = (deck: string) => {
  (fetch(`${ORIGIN}/decks/${deck}.json`)).then(async (res) => {
    presetDecks[deck] = (((await res.json())) as GameState);
  });
}

try {
  refreshDeck('global');
  setInterval(() => {
    console.debug(`${new Date()} Refreshing Decks`);
    refreshDeck('global');
  }, 1000 * 60 * 10);
} catch (e) {
  console.error(e)
}