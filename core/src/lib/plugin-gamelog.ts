import type { Plugin } from '@mcteamster/white-engine';
import type { Message } from '../Cards';

export type GameLogMove =
  | 'pickupCard'
  | 'moveCard'
  | 'claimCard'
  | 'submitCard'
  | 'shuffleCards'
  | 'loadCards'
  | 'setScore'
  | 'postMessage'
  | 'postRule'
  | 'revokeRule';

export interface GameLogEntry {
  id: number;
  timestamp: number;
  move: GameLogMove;
  playerID: string;
  playerName?: string; // display name of the actor (where available from client)
  cardID?: number;
  cardTitle?: string;
  target?: string;
  targetPlayerID?: string;
  targetPlayerName?: string;
  count?: number;   // for loadCards (cards added), shuffleCards (deck size after)
  delta?: number;   // for setScore
  setterID?: string; // for setScore (who set the score)
  setterName?: string;
  text?: string;    // for postMessage chat text
  ruleId?: number;  // for postRule, revokeRule
  ruleText?: string; // for postRule, revokeRule
}

interface GameLogData {
  entries: GameLogEntry[];
}

export interface GameLogAPI {
  record(entry: Omit<GameLogEntry, 'id' | 'timestamp'>): void;
  entries(): GameLogEntry[];
}

export interface GameLogPlugin {
  gamelog: GameLogAPI;
}

const MAX_ENTRIES = 500;

/** Convert a game log entry to a chat Message for display. Returns null for entries that shouldn't appear in chat. */
export function logEntryToMessage(entry: GameLogEntry): Message | null {
  const base = { id: entry.id, timestamp: entry.timestamp, playerID: entry.playerID };

  switch (entry.move) {
    case 'pickupCard':
      return { ...base, type: 'event', text: 'picked up a card' };

    case 'claimCard':
      return { ...base, type: 'event', text: `← "${entry.cardTitle}"` };

    case 'moveCard': {
      const title = entry.cardTitle ? `"${entry.cardTitle}"` : '';
      const recipientID = entry.targetPlayerID;

      let text: string;
      if (recipientID && entry.target === 'hand') {
        text = title ? `sent to {recipient}: ${title}` : `sent a card to {recipient}`;
      } else if (recipientID) {
        text = title ? `→ {recipient}'s ${entry.target}: ${title}` : `→ {recipient}'s ${entry.target}`;
      } else if (entry.target === 'pile') {
        text = title ? `→ ${title}` : `→ pile`;
      } else {
        text = title ? `→ ${entry.target}: ${title}` : `→ ${entry.target}`;
      }

      return { ...base, type: 'event', targetPlayerID: recipientID, text };
    }

    case 'submitCard':
      return { ...base, type: 'event', playerName: entry.playerName, text: 'made a card' };

    case 'shuffleCards':
      return { ...base, type: 'event', text: `shuffled — ${entry.count} in deck` };

    case 'loadCards':
      return { id: entry.id, timestamp: entry.timestamp, type: 'event', text: `${entry.count} ${entry.count === 1 ? 'card' : 'cards'} loaded — ${entry.delta} in deck` };

    case 'setScore': {
      const deltaStr = (entry.delta ?? 0) >= 0 ? `+${entry.delta}` : `${entry.delta}`;
      const target = entry.targetPlayerName || `Player ${entry.targetPlayerID}`;
      const by = entry.setterName && entry.setterName !== target ? ` (by ${entry.setterName})` : '';
      return { ...base, type: 'event', targetPlayerID: entry.targetPlayerID, text: `${deltaStr} pts for ${target}${by}` };
    }

    case 'postMessage':
      return { ...base, type: 'chat', playerName: entry.playerName, text: entry.text || '' };

    case 'postRule':
      return { ...base, type: 'rule', playerName: entry.playerName, text: entry.ruleText || '', ruleId: entry.ruleId };

    case 'revokeRule':
      return { ...base, type: 'event', playerName: entry.playerName, text: `removed rule: "${entry.ruleText}"` };

    default:
      return null;
  }
}

export const PluginGameLog = (): Plugin<GameLogAPI, GameLogData> => ({
  name: 'gamelog',
  setup: () => ({ entries: [] }),
  api: ({ data }) => ({
    record: (entry) => {
      if (!data?.entries) return;
      data.entries.push({ ...entry, id: data.entries.length + 1, timestamp: Date.now() });
      if (data.entries.length > MAX_ENTRIES) data.entries.shift();
    },
    entries: () => data?.entries ?? [],
  }),
  flush: ({ api }) => ({ entries: api.entries() }),
  // Server-side only — hide from clients
  playerView: () => undefined,
});
