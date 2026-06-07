import { GameState } from "../Game";

// Config Constants
export const ORIGIN = (typeof process === 'object') ? 'https://blankwhite.cards' : '';

// Preload Preset Decks
const PRESET_DECKS: { key: string; refreshMs: number }[] = [
  { key: 'global',      refreshMs: 1000 * 60 * 10 },       // every 10 minutes
  { key: 'standard',   refreshMs: 1000 * 60 * 60 * 24 },   // daily
  { key: 'party-2026', refreshMs: 1000 * 60 * 60 * 24 },   // daily
]

export const presetDecks: {[key: string]: GameState} = Object.fromEntries(
  PRESET_DECKS.map(({ key }) => [key, { cards: [] }])
)

const refreshDeck = (key: string, refreshMs: number) => {
  try {
    console.debug(`${new Date()} Refreshing Deck: ${key}`);
    fetch(`${ORIGIN}/decks/${key}.json`).then(async (res) => {
      presetDecks[key] = (await res.json()) as GameState;
    });
    setTimeout(refreshDeck, refreshMs, key, refreshMs);
  } catch (e) {
    console.error(e)
  }
}

export const startDeckPolling = () => {
  PRESET_DECKS.forEach(({ key, refreshMs }, i) => {
    setTimeout(refreshDeck, 1000 * 5 * (i + 1), key, refreshMs); // stagger by 5s each
  })
}
