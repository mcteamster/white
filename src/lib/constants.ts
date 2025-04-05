import { GameState } from "../Game";

// Config Constants
export const ORIGIN = 'https://blankwhite.cards';

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
      setTimeout(refreshDeck, 1000 * 60 * 10, 'global'); // Refresh global every 10 minutes thereafter
    } else if (deck == 'standard') {
      setTimeout(refreshDeck, 1000 * 60 * 60 * 24, 'standard'); // Refresh standard daily
    }
  } catch (e) {
    console.error(e)
  }
}

setTimeout(refreshDeck, 1000 * 10, 'global'); // 10 second delay
setTimeout(refreshDeck, 1000 * 20, 'standard'); // 20 second delay