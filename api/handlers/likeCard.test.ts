import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ── Mock AWS SDK ──────────────────────────────────────────────────────────────

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn(function () { return { send: mockSend }; }),
    GetObjectCommand: vi.fn(function (input) { this.input = input; }),
    PutObjectCommand: vi.fn(function (input) { this.input = input; }),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    pathParameters: { id: '42' },
    body: null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/like/42',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    resource: '',
    ...overrides,
  } as APIGatewayProxyEvent;
}

function makeGetObjectResponse(card: object) {
  return {
    Body: {
      transformToString: vi.fn().mockResolvedValue(JSON.stringify(card)),
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('likeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with updated likes count on happy path', async () => {
    const existingCard = { id: 42, content: { title: 'T', description: 'D' }, likes: 5 };
    mockSend
      .mockResolvedValueOnce(makeGetObjectResponse(existingCard)) // GetObject
      .mockResolvedValueOnce({});                                  // PutObject

    const { likeHandler } = await import('./likeCard.js');
    const result = await likeHandler(makeEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.likes).toBe(6);
  });

  it('initialises likes to 1 when card has no existing likes', async () => {
    const existingCard = { id: 42, content: { title: 'T', description: 'D' } };
    mockSend
      .mockResolvedValueOnce(makeGetObjectResponse(existingCard))
      .mockResolvedValueOnce({});

    const { likeHandler } = await import('./likeCard.js');
    const result = await likeHandler(makeEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.likes).toBe(1);
  });

  it('returns 500 when S3 GetObject throws', async () => {
    mockSend.mockRejectedValueOnce(new Error('S3 unavailable'));

    const { likeHandler } = await import('./likeCard.js');
    const result = await likeHandler(makeEvent());

    expect(result.statusCode).toBe(500);
  });

  it('throws when HTTP method is not POST', async () => {
    const { likeHandler } = await import('./likeCard.js');

    await expect(
      likeHandler(makeEvent({ httpMethod: 'GET' }))
    ).rejects.toThrow('POST');
  });

  it('calls PutObject to persist the updated card', async () => {
    const existingCard = { id: 42, content: { title: 'T', description: 'D' }, likes: 10 };
    mockSend
      .mockResolvedValueOnce(makeGetObjectResponse(existingCard))
      .mockResolvedValueOnce({});

    const { likeHandler } = await import('./likeCard.js');
    await likeHandler(makeEvent());

    // Two sends: GetObject then PutObject
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('returns correct CORS headers', async () => {
    const existingCard = { id: 42, content: { title: 'T', description: 'D' }, likes: 1 };
    mockSend
      .mockResolvedValueOnce(makeGetObjectResponse(existingCard))
      .mockResolvedValueOnce({});

    const { likeHandler } = await import('./likeCard.js');
    const result = await likeHandler(makeEvent());

    expect(result.headers?.['Access-Control-Allow-Methods']).toBe('POST');
  });
});
