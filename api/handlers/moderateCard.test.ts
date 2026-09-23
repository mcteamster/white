import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock AWS SDK ──────────────────────────────────────────────────────────────

const mockS3Send = vi.fn();
const mockCFSend = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockS3Send })),
  GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
  PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

vi.mock('@aws-sdk/client-cloudfront', () => ({
  CloudFrontClient: vi.fn().mockImplementation(() => ({ send: mockCFSend })),
  CreateInvalidationCommand: vi.fn().mockImplementation((input) => ({ input })),
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
});
