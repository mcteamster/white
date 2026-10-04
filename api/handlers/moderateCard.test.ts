import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock AWS SDK ──────────────────────────────────────────────────────────────

const mockS3Send = vi.fn();
const mockCFSend = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function () { return { send: mockS3Send }; }),
  GetObjectCommand: vi.fn(function (input) { this.input = input; }),
  PutObjectCommand: vi.fn(function (input) { this.input = input; }),
}));

vi.mock('@aws-sdk/client-cloudfront', () => ({
  CloudFrontClient: vi.fn(function () { return { send: mockCFSend }; }),
  CreateInvalidationCommand: vi.fn(function (input) { this.input = input; }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDeck(cards: Array<{ id: number; location: string }>) {
  return {
    cards: cards.map((c) => ({
      id: c.id,
      content: { title: `Card ${c.id}`, description: 'D', author: 'ghost' },
      location: c.location,
    })),
  };
}

function makeGetDeckResponse(deck: object) {
  return {
    Body: {
      transformToString: vi.fn().mockResolvedValue(JSON.stringify(deck)),
    },
  };
}

function makeGetCardResponse(card: object) {
  return {
    Body: {
      transformToString: vi.fn().mockResolvedValue(JSON.stringify(card)),
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('hideCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore CF mock default after clearAllMocks resets it
    mockCFSend.mockResolvedValue({});
  });

  it('returns error when hide and show are both empty', async () => {
    const { hideCard } = await import('./moderateCard.js');
    const result = await hideCard({});
    expect(result).toMatchObject({ error: expect.stringContaining('card ID') });
  });

  it('sets card location to "box" when hiding', async () => {
    const deck = makeDeck([
      { id: 1, location: 'deck' },
      { id: 2, location: 'deck' },
    ]);
    mockS3Send
      .mockResolvedValueOnce(makeGetDeckResponse(deck))           // GET global.json
      .mockResolvedValueOnce({})                                   // PUT global.json
      .mockResolvedValueOnce({})                                   // PUT chunk
      .mockResolvedValueOnce(makeGetCardResponse(deck.cards[0]))  // GET card/1.json
      .mockResolvedValueOnce({});                                  // PUT card/1.json

    const { hideCard } = await import('./moderateCard.js');
    const result = await hideCard({ hide: [1] });

    expect(result.results).toContain('1: hidden');
  });

  it('sets card location to "deck" when showing', async () => {
    const deck = makeDeck([{ id: 5, location: 'box' }]);
    mockS3Send
      .mockResolvedValueOnce(makeGetDeckResponse(deck))
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(makeGetCardResponse(deck.cards[0]))
      .mockResolvedValueOnce({});

    const { hideCard } = await import('./moderateCard.js');
    const result = await hideCard({ show: [5] });

    expect(result.results).toContain('5: shown');
  });

  it('reports "not found" for unknown card IDs', async () => {
    const deck = makeDeck([{ id: 1, location: 'deck' }]);
    // For unknown ids: GET global, PUT global (unchanged), no chunk update, no card GET/PUT
    mockS3Send
      .mockResolvedValueOnce(makeGetDeckResponse(deck))   // GET global.json
      .mockResolvedValueOnce({});                          // PUT global.json (no cards affected, no chunk)

    const { hideCard } = await import('./moderateCard.js');
    const result = await hideCard({ hide: [999] });

    expect(result.results).toContain('999: not found');
  });

  it('triggers a CloudFront invalidation', async () => {
    const deck = makeDeck([{ id: 10, location: 'deck' }]);
    mockS3Send
      .mockResolvedValueOnce(makeGetDeckResponse(deck))           // GET global.json
      .mockResolvedValueOnce({})                                   // PUT global.json
      .mockResolvedValueOnce({})                                   // PUT chunk
      .mockResolvedValueOnce(makeGetCardResponse(deck.cards[0]))  // GET card/10.json
      .mockResolvedValueOnce({});                                  // PUT card/10.json

    const { hideCard } = await import('./moderateCard.js');
    await hideCard({ hide: [10] });

    expect(mockCFSend).toHaveBeenCalledTimes(1);
  });

  it('includes the global deck path in invalidation', async () => {
    const deck = makeDeck([{ id: 2, location: 'deck' }]);
    mockS3Send
      .mockResolvedValueOnce(makeGetDeckResponse(deck))
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(makeGetCardResponse(deck.cards[0]))
      .mockResolvedValueOnce({});

    const { hideCard } = await import('./moderateCard.js');
    const result = await hideCard({ hide: [2] });

    expect(result.invalidated).toContain('/decks/global.json');
  });

  it('handles both hide and show in the same call', async () => {
    const deck = makeDeck([
      { id: 1, location: 'deck' },
      { id: 2, location: 'box' },
    ]);
    // hide [1] and show [2]:
    // GET global → PUT global → PUT chunk(s) → GET card/1 → PUT card/1 → GET card/2 → PUT card/2
    mockS3Send
      .mockResolvedValueOnce(makeGetDeckResponse(deck))           // GET global.json
      .mockResolvedValueOnce({})                                   // PUT global.json
      .mockResolvedValueOnce({})                                   // PUT chunk (both IDs share chunk 0)
      .mockResolvedValueOnce(makeGetCardResponse(deck.cards[0]))  // GET card/1.json
      .mockResolvedValueOnce({})                                   // PUT card/1.json
      .mockResolvedValueOnce(makeGetCardResponse(deck.cards[1]))  // GET card/2.json
      .mockResolvedValueOnce({});                                  // PUT card/2.json

    const { hideCard } = await import('./moderateCard.js');
    const result = await hideCard({ hide: [1], show: [2] });

    expect(result.results).toContain('1: hidden');
    expect(result.results).toContain('2: shown');
  });

  describe('chunk filtering', () => {
    it('includes hidden card as a stub in the rewritten chunk after hide', async () => {
      const deck = makeDeck([
        { id: 1, location: 'deck' },
        { id: 2, location: 'deck' },
      ]);
      mockS3Send
        .mockResolvedValueOnce(makeGetDeckResponse(deck))           // GET global.json
        .mockResolvedValueOnce({})                                   // PUT global.json
        .mockResolvedValueOnce({})                                   // PUT chunk
        .mockResolvedValueOnce(makeGetCardResponse(deck.cards[0]))  // GET card/1.json
        .mockResolvedValueOnce({});                                  // PUT card/1.json

      const { hideCard } = await import('./moderateCard.js');
      await hideCard({ hide: [1] });

      // Chunk PUT is the third S3 call (index 2)
      const chunkPutCall = mockS3Send.mock.calls[2][0];
      const chunkBody = JSON.parse(chunkPutCall.input.Body);
      const chunkIds = chunkBody.cards.map((c: { id: number }) => c.id);

      // Hidden card must appear as a stub — id and location preserved, content blanked
      expect(chunkIds).toContain(1);
      const stub = chunkBody.cards.find((c: { id: number }) => c.id === 1);
      expect(stub.location).toBe('box');
      expect(stub.content.title).toBe('');
      expect(stub.content.description).toBe('');
      expect(stub.content.author).toBe('');
      expect(stub.content.image).toBeUndefined();
      expect(chunkIds).toContain(2); // visible — must be present with full content
    });

    it('includes shown card with full content in the rewritten chunk after show', async () => {
      const deck = makeDeck([
        { id: 1, location: 'box' },   // currently hidden
        { id: 2, location: 'deck' },
      ]);
      mockS3Send
        .mockResolvedValueOnce(makeGetDeckResponse(deck))           // GET global.json
        .mockResolvedValueOnce({})                                   // PUT global.json
        .mockResolvedValueOnce({})                                   // PUT chunk
        .mockResolvedValueOnce(makeGetCardResponse(deck.cards[0]))  // GET card/1.json
        .mockResolvedValueOnce({});                                  // PUT card/1.json

      const { hideCard } = await import('./moderateCard.js');
      await hideCard({ show: [1] });

      // Chunk PUT is the third S3 call (index 2)
      const chunkPutCall = mockS3Send.mock.calls[2][0];
      const chunkBody = JSON.parse(chunkPutCall.input.Body);
      const chunkIds = chunkBody.cards.map((c: { id: number }) => c.id);

      // Shown card must appear with full content (not a stub)
      expect(chunkIds).toContain(1);
      const shown = chunkBody.cards.find((c: { id: number }) => c.id === 1);
      expect(shown.location).toBe('deck');
      expect(shown.content.title).toBe('Card 1'); // full content restored from global.json
      expect(chunkIds).toContain(2);  // was already visible
    });
  });

  describe('conditional writes (ETag / IfMatch)', () => {
    // Task 4.1: PutObjectCommand for decks/global.json includes IfMatch set to the ETag from GET
    it('4.1 passes the ETag from GET as IfMatch on PUT for decks/global.json', async () => {
      const deck = makeDeck([{ id: 3, location: 'deck' }]);
      const testEtag = '"moderate-etag-xyz"';
      const getDeckResponse = {
        ETag: testEtag,
        Body: { transformToString: vi.fn().mockResolvedValue(JSON.stringify(deck)) },
      };
      mockS3Send
        .mockResolvedValueOnce(getDeckResponse)               // GET global.json (returns ETag)
        .mockResolvedValueOnce({})                             // PUT global.json
        .mockResolvedValueOnce({})                             // PUT chunk
        .mockResolvedValueOnce(makeGetCardResponse(deck.cards[0]))  // GET card/3.json
        .mockResolvedValueOnce({});                            // PUT card/3.json

      const { hideCard } = await import('./moderateCard.js');
      await hideCard({ hide: [3] });

      // PUT global.json is the second S3 call (index 1)
      const putGlobalCall = mockS3Send.mock.calls[1][0];
      expect(putGlobalCall.input.Key).toBe('decks/global.json');
      expect(putGlobalCall.input.IfMatch).toBe(testEtag);
    });

    // Task 4.2: First PUT rejects with PreconditionFailed, second succeeds → returns result
    it('4.2 retries on PreconditionFailed and returns a successful result when retry succeeds', async () => {
      const deck = makeDeck([{ id: 7, location: 'deck' }]);
      const preconditionError = Object.assign(new Error('PreconditionFailed'), {
        name: 'PreconditionFailed',
      });
      const makeDeckResponse = () => ({
        ETag: '"etag-moderate-v1"',
        Body: { transformToString: vi.fn().mockResolvedValue(JSON.stringify(deck)) },
      });

      mockS3Send
        // First attempt: GET succeeds, PUT global fails with PreconditionFailed
        .mockResolvedValueOnce(makeDeckResponse())           // GET global.json (attempt 1)
        .mockRejectedValueOnce(preconditionError)            // PUT global.json → PreconditionFailed
        // Second attempt: GET succeeds, PUT global succeeds
        .mockResolvedValueOnce(makeDeckResponse())           // GET global.json (attempt 2)
        .mockResolvedValueOnce({})                           // PUT global.json → success
        .mockResolvedValueOnce({})                           // PUT chunk
        .mockResolvedValueOnce(makeGetCardResponse(deck.cards[0]))  // GET card/7.json
        .mockResolvedValueOnce({});                          // PUT card/7.json

      const { hideCard } = await import('./moderateCard.js');
      const result = await hideCard({ hide: [7] });

      expect(result.results).toContain('7: hidden');
    });

    // Task 4.3: All retry attempts return PreconditionFailed → propagates error
    it('4.3 propagates error when all retries are exhausted by PreconditionFailed', async () => {
      const deck = makeDeck([{ id: 9, location: 'deck' }]);
      const preconditionError = Object.assign(new Error('PreconditionFailed'), {
        name: 'PreconditionFailed',
      });
      const makeDeckResponse = () => ({
        ETag: '"etag-stale"',
        Body: { transformToString: vi.fn().mockResolvedValue(JSON.stringify(deck)) },
      });

      // 3 attempts × (GET + PUT global[PreconditionFailed])
      mockS3Send
        .mockResolvedValueOnce(makeDeckResponse()) // GET attempt 1
        .mockRejectedValueOnce(preconditionError)  // PUT global → fail
        .mockResolvedValueOnce(makeDeckResponse()) // GET attempt 2
        .mockRejectedValueOnce(preconditionError)  // PUT global → fail
        .mockResolvedValueOnce(makeDeckResponse()) // GET attempt 3
        .mockRejectedValueOnce(preconditionError); // PUT global → fail

      const { hideCard } = await import('./moderateCard.js');
      await expect(hideCard({ hide: [9] })).rejects.toThrow('PreconditionFailed');
    });
  });
});
