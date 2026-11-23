import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlankWhiteCards } from '@mcteamster/white-core';
import { Client } from '../../../engine/packages/client.ts';
import { registerRoutes } from '../../../server/src/routes';
import { downloadDeckJSON } from './data';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('restored-card export flow', () => {
  it('exports a restored card as visible and keeps Deck Editor edits on the exported copy', async () => {
    vi.stubEnv('PRESETS_CONFIG', '/dev/null');

    const client = Client({ game: BlankWhiteCards, playerID: '0', singleplayer: true });
    client.start();
    client.moves.submitCard({
      id: 0,
      content: { title: 'Restored card', description: 'Hidden during moderation' },
      location: 'box',
    });

    const cardId = client.getState()!.G.cards[0].id;
    expect(client.getState()!.G.cards[0].location).toBe('box');
    client.moves.moveCard(cardId, 'deck');
    const activeCards = client.getState()!.G.cards;
    expect(activeCards.find(card => card.id === cardId)?.location).toBe('deck');

    let exportHandler: ((ctx: any) => Promise<void>) | undefined;
    const server = {
      router: {
        get: (path: string, handler: (ctx: any) => Promise<void>) => {
          if (path === '/export/:matchID') exportHandler = handler;
        },
      },
      db: { fetch: vi.fn(async () => ({ state: client.getState() })) },
    };
    registerRoutes(server as never);

    const ctx = {
      params: { matchID: 'BWC1' },
      body: undefined as string | undefined,
      set: vi.fn(),
    };
    await exportHandler!(ctx);
    const matchExport = JSON.parse(decodeURI(atob(ctx.body!)));
    expect(matchExport.cards.find((card: { id: number }) => card.id === cardId).location).toBe('deck');

    const editorCopy = activeCards.map(card => ({
      ...card,
      location: card.id === cardId ? 'box' : card.location,
    }));
    let downloadHref = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      downloadHref = this.getAttribute('href') || '';
    });
    downloadDeckJSON(editorCopy, 'edited-copy');

    const editedExport = JSON.parse(decodeURIComponent(downloadHref.split(',')[1]));
    expect(editedExport.cards.find((card: { id: number }) => card.id === cardId).location).toBe('box');
    expect(client.getState()!.G.cards.find(card => card.id === cardId)?.location).toBe('deck');
  });
});
