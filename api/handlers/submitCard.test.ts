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
        .mockResolvedValueOnce({})  // PUT card/<n>.json
        .mockResolvedValueOnce({})  // PUT global.json
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

      // The PUT for the individual card should include id=11
      // First PutObject call is PUT card/11.json
      const putCall = mockS3Send.mock.calls[1][0];
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

      const putCall = mockS3Send.mock.calls[1][0];
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

      const putCall = mockS3Send.mock.calls[1][0];
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
        .mockRejectedValueOnce(new Error('S3 write error')); // PUT fails

      const messageId = 'msg-put-fail';
      const { submitHandler } = await import('./submitCard.js');
      const result = await submitHandler(
        makeSQSEvent({ title: 'Card', description: 'Content', author: 'ghost' }, messageId)
      );

      expect(result).toMatchObject({
        batchItemFailures: [{ itemIdentifier: messageId }],
      });
    });
  });
});
