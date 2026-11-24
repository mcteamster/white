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
  it('exports multiplayer restores from Hand and Deck as visible while keeping boxed cards hidden', async () => {
    vi.stubEnv('PRESETS_CONFIG', '/dev/null');

    const client = Client({ game: BlankWhiteCards, playerID: '0', numPlayers: 2, singleplayer: true });
    client.start();
    for (const title of ['Restored to hand', 'Restored to deck', 'Still boxed']) {
      client.moves.submitCard({
        id: 0,
        content: { title, description: 'Hidden during moderation' },
        location: 'box',
      });
    }

    const [handCard, deckCard, boxedCard] = client.getState()!.G.cards;
    client.moves.moveCard(handCard.id, 'hand');
    client.moves.moveCard(deckCard.id, 'deck');
    const activeCards = client.getState()!.G.cards;
    expect(client.getState()!.ctx.numPlayers).toBe(2);
    expect(activeCards.find(card => card.id === handCard.id)).toMatchObject({ location: 'hand', owner: '0' });
    expect(activeCards.find(card => card.id === deckCard.id)?.location).toBe('deck');
    expect(activeCards.find(card => card.id === boxedCard.id)?.location).toBe('box');

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
    expect(matchExport.cards.find((card: { id: number }) => card.id === handCard.id).location).toBe('deck');
    expect(matchExport.cards.find((card: { id: number }) => card.id === deckCard.id).location).toBe('deck');
    expect(matchExport.cards.find((card: { id: number }) => card.id === boxedCard.id).location).toBe('box');

    const editorCopy = activeCards.map(card => ({
      ...card,
      location: card.id === deckCard.id ? 'box' : card.location,
    }));
    let downloadHref = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      downloadHref = this.getAttribute('href') || '';
    });
    downloadDeckJSON(editorCopy, 'edited-copy');

    const editedExport = JSON.parse(decodeURIComponent(downloadHref.split(',')[1]));
    expect(editedExport.cards.find((card: { id: number }) => card.id === deckCard.id).location).toBe('box');
    expect(client.getState()!.G.cards.find(card => card.id === deckCard.id)?.location).toBe('deck');
  });
});
