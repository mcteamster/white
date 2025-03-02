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
    console.debug(`${new Date()} Refreshing Decks`);
    (fetch(`${ORIGIN}/decks/${deck}.json`)).then(async (res) => {
      presetDecks[deck] = (((await res.json())) as GameState);
    });

    setTimeout(refreshDeck, 1000 * 60 * 10, 'global'); // Refresh every 10 minutes thereafter
  } catch (e) {
    console.error(e)
  }
}

setTimeout(refreshDeck, 1000 * 15, 'global'); // Refresh after first 15 seconds