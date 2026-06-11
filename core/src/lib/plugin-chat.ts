import type { Plugin } from 'boardgame.io';
import type { Message } from '../Cards';
import type { GameLogEntry } from './plugin-gamelog';
import { logEntryToMessage } from './plugin-gamelog';

interface ChatData {
  messages: Message[];
  lastLogId: number; // tracks which log entries have been converted
}

export interface ChatAPI {
  syncFromLog(entries: GameLogEntry[]): void;
  getMessages(): Message[];
}

export interface ChatPlugin extends Record<string, unknown> {
  chat: ChatAPI;
}

const MAX_MESSAGES = 200;

export const PluginChat = (): Plugin<ChatAPI, ChatData> => ({
  name: 'chat',
  setup: () => ({ messages: [], lastLogId: 0 }),
  api: ({ data }) => ({
    syncFromLog: (entries: GameLogEntry[]) => {
      const newEntries = entries.filter(e => e.id > data.lastLogId);
      for (const entry of newEntries) {
        const msg = logEntryToMessage(entry);
        if (msg) {
          data.messages.push(msg);
          if (data.messages.length > MAX_MESSAGES) data.messages.shift();
        }
        data.lastLogId = entry.id;
      }
    },
    getMessages: () => data.messages,
  }),
  flush: ({ api, data }) => ({ messages: api.getMessages(), lastLogId: data.lastLogId }),
});
