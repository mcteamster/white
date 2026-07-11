import type { GameState } from "../Game";

/** In-memory deck cache — populated by the server, read by Game.ts setup */
export const presetDecks: { [key: string]: GameState } = {};
