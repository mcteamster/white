import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SQSEvent } from 'aws-lambda';

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

interface CardBody {
  title: string;
  description: string;
  author?: string;
  image?: string;
}

function makeSQSEvent(body: CardBody, messageId = 'msg-001'): SQSEvent {
  return {
    Records: [
      {
        messageId,
        receiptHandle: 'handle',
        body: JSON.stringify(body),
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: '0',
          SenderId: 'SENDER',
          ApproximateFirstReceiveTimestamp: '0',
        },
        messageAttributes: {},
        md5OfBody: '',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:000000000000:test-queue',
        awsRegion: 'us-east-1',
      },
    ],
  };
}

function makeSQSEventRawBody(rawBody: string, messageId = 'msg-001'): SQSEvent {
  return {
    Records: [
      {
        messageId,
        receiptHandle: 'handle',
        body: rawBody,
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: '0',
          SenderId: 'SENDER',
          ApproximateFirstReceiveTimestamp: '0',
        },
        messageAttributes: {},
        md5OfBody: '',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:000000000000:test-queue',
        awsRegion: 'us-east-1',
      },
    ],
  };
}

function makeCurrentDeck(cardCount: number) {
  return {
    cards: Array.from({ length: cardCount }, (_, i) => ({
      id: i + 1,
      content: { title: `Card ${i + 1}`, description: 'D', author: 'ghost' },
      location: 'deck',
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('submitHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCFSend.mockResolvedValue({});
  });

  describe('happy path', () => {
    it('returns null on success (SQS success signal)', async () => {
      const deck = makeCurrentDeck(5);
      mockS3Send
        .mockResolvedValueOnce(makeGetDeckResponse(deck))  // GET global.json
        .mockResolvedValueOnce({})  // PUT global.json (IfMatch gate)
        .mockResolvedValueOnce({})  // PUT card/<n>.json (after winning the race)
        .mockResolvedValueOnce({})  // PUT chunk
        .mockResolvedValueOnce({}); // PUT manifest

      const { submitHandler } = await import('./submitCard.js');
      const result = await submitHandler(
        makeSQSEvent({ title: 'A New Card', description: 'With some content', author: 'ghost' })
      );

      expect(result).toBeNull();
    });

    it('assigns id as currentDeck.cards.length + 1', async () => {
      const deck = makeCurrentDeck(10);
      mockS3Send
        .mockResolvedValueOnce(makeGetDeckResponse(deck))
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const { submitHandler } = await import('./submitCard.js');
      await submitHandler(
        makeSQSEvent({ title: 'Card Eleven', description: 'The eleventh card', author: 'ghost' })
      );

      // The PUT for the individual card is the third S3 call (index 2), after the IfMatch PUT
      const putCall = mockS3Send.mock.calls[2][0];
      const body = JSON.parse(putCall.input.Body);
      expect(body.id).toBe(11);
    });

    it('defaults author to "anon" when not provided', async () => {
      const deck = makeCurrentDeck(0);
      mockS3Send
        .mockResolvedValueOnce(makeGetDeckResponse(deck))
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const { submitHandler } = await import('./submitCard.js');
      await submitHandler(
        makeSQSEvent({ title: 'Anonymous Card', description: 'A card without an author' })
      );

      // The PUT for the individual card is the third S3 call (index 2), after the IfMatch PUT
      const putCall = mockS3Send.mock.calls[2][0];
      const body = JSON.parse(putCall.input.Body);
      expect(body.content.author).toBe('anon');
    });

    it('sets location to "deck"', async () => {
      const deck = makeCurrentDeck(2);
      mockS3Send
        .mockResolvedValueOnce(makeGetDeckResponse(deck))
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const { submitHandler } = await import('./submitCard.js');
      await submitHandler(
        makeSQSEvent({ title: 'New Card', description: 'Goes to deck', author: 'ghost' })
      );

      // The PUT for the individual card is the third S3 call (index 2), after the IfMatch PUT
      const putCall = mockS3Send.mock.calls[2][0];
      const body = JSON.parse(putCall.input.Body);
      expect(body.location).toBe('deck');
    });
  });

  describe('validation — invalid inputs throw', () => {
    it('throws for title longer than 50 characters', async () => {
      const { submitHandler } = await import('./submitCard.js');
      await expect(
        submitHandler(makeSQSEvent({
          title: 'A'.repeat(51),
          description: 'Valid description',
          author: 'ghost',
        }))
      ).rejects.toThrow('title');
    });

    it('throws for empty title', async () => {
      const { submitHandler } = await import('./submitCard.js');
      await expect(
        submitHandler(makeSQSEvent({ title: '', description: 'Valid', author: 'ghost' }))
      ).rejects.toThrow('title');
    });

    it('throws for description longer than 140 characters', async () => {
      const { submitHandler } = await import('./submitCard.js');
      await expect(
        submitHandler(makeSQSEvent({
          title: 'Valid Title',
          description: 'D'.repeat(141),
          author: 'ghost',
        }))
      ).rejects.toThrow('description');
    });

    it('throws for empty description', async () => {
      const { submitHandler } = await import('./submitCard.js');
      await expect(
        submitHandler(makeSQSEvent({ title: 'Valid', description: '', author: 'ghost' }))
      ).rejects.toThrow('description');
    });

    it('throws for author longer than 25 characters', async () => {
      const { submitHandler } = await import('./submitCard.js');
      await expect(
        submitHandler(makeSQSEvent({
          title: 'Valid',
          description: 'Valid',
          author: 'A'.repeat(26),
        }))
      ).rejects.toThrow('author');
    });

    it('throws for PNG data URI image', async () => {
      const { submitHandler } = await import('./submitCard.js');
      await expect(
        submitHandler(makeSQSEvent({
          title: 'Valid',
          description: 'Valid',
          author: 'ghost',
          image: 'data:image/png;base64,abc123',
        }))
      ).rejects.toThrow('PNG');
    });

    it('throws for image with invalid checksum', async () => {
      const { submitHandler } = await import('./submitCard.js');
      // A short string of printable chars — checksum will not equal 250000
      const badImage = 'abc';
      await expect(
        submitHandler(makeSQSEvent({
          title: 'Valid',
          description: 'Valid',
          author: 'ghost',
          image: badImage,
        }))
      ).rejects.toThrow('image');
    });
  });

  describe('AWS error handling', () => {
    it('returns a batchItemFailures response when S3 GET throws', async () => {
      mockS3Send.mockRejectedValueOnce(new Error('S3 read error'));

      const messageId = 'msg-failure-001';
      const { submitHandler } = await import('./submitCard.js');
      const result = await submitHandler(
        makeSQSEvent({ title: 'Card', description: 'Content', author: 'ghost' }, messageId)
      );

      expect(result).toMatchObject({
        batchItemFailures: [{ itemIdentifier: messageId }],
      });
    });

    it('returns a batchItemFailures response when S3 PUT throws', async () => {
      const deck = makeCurrentDeck(0);
      mockS3Send
        .mockResolvedValueOnce(makeGetDeckResponse(deck))  // GET global.json
        .mockRejectedValueOnce(new Error('S3 write error')); // PUT global.json fails (non-retryable)

      const messageId = 'msg-put-fail';
      const { submitHandler } = await import('./submitCard.js');
      const result = await submitHandler(
        makeSQSEvent({ title: 'Card', description: 'Content', author: 'ghost' }, messageId)
      );

      expect(result).toMatchObject({
        batchItemFailures: [{ itemIdentifier: messageId }],
      });
    });

    it('returns batchItemFailures when message body is not valid JSON', async () => {
      const messageId = 'msg-bad-json';
      const { submitHandler } = await import('./submitCard.js');
      const result = await submitHandler(
        makeSQSEventRawBody('this is not valid json {{{}', messageId)
      );

      expect(result).toMatchObject({
        batchItemFailures: [{ itemIdentifier: messageId }],
      });
    });
  });

  describe('chunk filtering', () => {
    it('excludes hidden (box) cards from the chunk file write', async () => {
      // Deck with 2 visible cards and 1 hidden card in the same chunk
      const deck = {
        cards: [
          { id: 1, content: { title: 'Visible 1', description: 'D', author: 'ghost' }, location: 'deck' },
          { id: 2, content: { title: 'Hidden',    description: 'D', author: 'ghost' }, location: 'box' },
          { id: 3, content: { title: 'Visible 3', description: 'D', author: 'ghost' }, location: 'deck' },
        ],
      };
      mockS3Send
        .mockResolvedValueOnce(makeGetDeckResponse(deck))  // GET global.json
        .mockResolvedValueOnce({})                          // PUT global.json (IfMatch gate)
        .mockResolvedValueOnce({})                          // PUT card/<n>.json
        .mockResolvedValueOnce({})                          // PUT chunk
        .mockResolvedValueOnce({});                         // PUT manifest

      const { submitHandler } = await import('./submitCard.js');
      await submitHandler(
        makeSQSEvent({ title: 'New Card', description: 'Fourth card', author: 'ghost' })
      );

      // The chunk PUT is the fourth S3 call (index 3)
      const chunkPutCall = mockS3Send.mock.calls[3][0];
      const chunkBody = JSON.parse(chunkPutCall.input.Body);
      const chunkIds = chunkBody.cards.map((c: { id: number }) => c.id);

      // Hidden card (id 2) must not appear in the chunk
      expect(chunkIds).not.toContain(2);
      // Visible cards and the new card must appear
      expect(chunkIds).toContain(1);
      expect(chunkIds).toContain(3);
      expect(chunkIds).toContain(4); // newly submitted card
    });
  });

  describe('conditional writes (ETag / IfMatch)', () => {
    // Task 3.1: PutObjectCommand for decks/global.json includes IfMatch set to the ETag from GET
    it('3.1 passes the ETag from GET as IfMatch on PUT for decks/global.json', async () => {
      const deck = makeCurrentDeck(3);
      const testEtag = '"abc123etag"';
      const getDeckResponse = {
        ETag: testEtag,
        Body: { transformToString: vi.fn().mockResolvedValue(JSON.stringify(deck)) },
      };
      mockS3Send
        .mockResolvedValueOnce(getDeckResponse)  // GET global.json (returns ETag)
        .mockResolvedValueOnce({})               // PUT global.json (IfMatch gate)
        .mockResolvedValueOnce({})               // PUT card/<n>.json (after winning the race)
        .mockResolvedValueOnce({})               // PUT chunk
        .mockResolvedValueOnce({});              // PUT manifest

      const { submitHandler } = await import('./submitCard.js');
      await submitHandler(
        makeSQSEvent({ title: 'ETag Test', description: 'Checking IfMatch', author: 'ghost' })
      );

      // Find the PUT call for decks/global.json (second S3 call: index 1)
      const putGlobalCall = mockS3Send.mock.calls[1][0];
      expect(putGlobalCall.input.Key).toBe('decks/global.json');
      expect(putGlobalCall.input.IfMatch).toBe(testEtag);
    });

    // Task 3.2: First PUT rejects with PreconditionFailed, second succeeds → returns null
    it('3.2 retries on PreconditionFailed and returns null when retry succeeds', async () => {
      const deck = makeCurrentDeck(2);
      const preconditionError = Object.assign(new Error('PreconditionFailed'), {
        name: 'PreconditionFailed',
      });
      const makeDeckResponse = () => ({
        ETag: '"etag-v1"',
        Body: { transformToString: vi.fn().mockResolvedValue(JSON.stringify(deck)) },
      });

      mockS3Send
        // First attempt
        .mockResolvedValueOnce(makeDeckResponse())  // GET global.json (attempt 1)
        .mockRejectedValueOnce(preconditionError)   // PUT global.json → PreconditionFailed (card file not written)
        // Second attempt (retry)
        .mockResolvedValueOnce(makeDeckResponse())  // GET global.json (attempt 2)
        .mockResolvedValueOnce({})                  // PUT global.json → success
        .mockResolvedValueOnce({})                  // PUT card/<n>.json (after winning the race)
        .mockResolvedValueOnce({})                  // PUT chunk
        .mockResolvedValueOnce({});                 // PUT manifest

      const messageId = 'msg-retry-success';
      const { submitHandler } = await import('./submitCard.js');
      const result = await submitHandler(
        makeSQSEvent({ title: 'Retry Card', description: 'Race condition test', author: 'ghost' }, messageId)
      );

      expect(result).toBeNull();
    });

    // Task 3.3: All retry attempts return PreconditionFailed → returns batchItemFailures
    it('3.3 returns batchItemFailures when all retries are exhausted by PreconditionFailed', async () => {
      const deck = makeCurrentDeck(1);
      const preconditionError = Object.assign(new Error('PreconditionFailed'), {
        name: 'PreconditionFailed',
      });
      const makeDeckResponse = () => ({
        ETag: '"etag-stale"',
        Body: { transformToString: vi.fn().mockResolvedValue(JSON.stringify(deck)) },
      });

      // 3 attempts × (GET + PUT global[PreconditionFailed]) — card file is never written on a losing attempt
      mockS3Send
        .mockResolvedValueOnce(makeDeckResponse()) // GET attempt 1
        .mockRejectedValueOnce(preconditionError)  // PUT global → fail
        .mockResolvedValueOnce(makeDeckResponse()) // GET attempt 2
        .mockRejectedValueOnce(preconditionError)  // PUT global → fail
        .mockResolvedValueOnce(makeDeckResponse()) // GET attempt 3
        .mockRejectedValueOnce(preconditionError); // PUT global → fail

      const messageId = 'msg-exhausted';
      const { submitHandler } = await import('./submitCard.js');
      const result = await submitHandler(
        makeSQSEvent({ title: 'Exhausted', description: 'All retries fail', author: 'ghost' }, messageId)
      );

      expect(result).toMatchObject({
        batchItemFailures: [{ itemIdentifier: messageId }],
      });
    });
  });
});
