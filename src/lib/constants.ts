import { GameState } from "../Game";

// Config Constants
export const WEB_SERVER = 'https://white.mcteamster.com';

// Preload Preset Decks
export const presetDecks: {[key: string]: GameState} = {
  global: { cards: [] },
  standard: { cards: [] },
}

try {
  (fetch(`${WEB_SERVER}/decks/global.json`)).then(async (res) => {
    presetDecks['global'] = (((await res.json())) as GameState);
  });
} catch (e) {
  console.error(e)
}