import { GameState } from "../Game";

// Config Constants
export const ORIGIN = 'https://white.mcteamster.com';

// Preload Preset Decks
export const presetDecks: {[key: string]: GameState} = {
  global: { cards: [] },
  standard: { cards: [] },
}

const refreshDeck = (deck: string) => {
  try {
    console.debug(`${new Date()} Refreshing Deck: ${deck}`);
    (fetch(`${ORIGIN}/decks/${deck}.json`)).then(async (res) => {
      presetDecks[deck] = (((await res.json())) as GameState);
    });

    if (deck == 'global') {
      setTimeout(refreshDeck, 1000 * 60 * 10, 'global'); // Refresh only global every 10 minutes thereafter
    }
  } catch (e) {
    console.error(e)
  }
}

setTimeout(refreshDeck, 1000 * 15, 'global'); // Refresh after first 15 seconds
setTimeout(refreshDeck, 1000 * 30, 'standard'); // Refresh once first 30 seconds