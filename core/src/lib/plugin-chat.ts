import type { Plugin } from 'boardgame.io';
import type { Message } from '../Cards';

interface ChatData {
  messages: Message[];
}

export interface ChatAPI {
  send(msg: Omit<Message, 'id' | 'timestamp'>): void;
  getMessages(): Message[];
}

export interface ChatPlugin extends Record<string, unknown> {
  chat: ChatAPI;
}

const MAX_MESSAGES = 200;

export const PluginChat = (): Plugin<ChatAPI, ChatData> => ({
  name: 'chat',
  setup: () => ({ messages: [] }),
  api: ({ data }) => ({
    send: (msg) => {
      data.messages.push({ ...msg, id: data.messages.length + 1, timestamp: Date.now() });
      if (data.messages.length > MAX_MESSAGES) data.messages.shift();
    },
    getMessages: () => data.messages,
  }),
  flush: ({ api }) => ({ messages: api.getMessages() }),
});
