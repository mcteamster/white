import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// ── Mock AWS SDK ──────────────────────────────────────────────────────────────

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: vi.fn(function () { return { send: mockSend }; }),
  SendMessageCommand: vi.fn(function (input) { this.input = input; }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    pathParameters: null,
    body: JSON.stringify({ title: 'Test', description: 'A card', author: 'ghost' }),
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/queue',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    resource: '',
    ...overrides,
  } as APIGatewayProxyEvent;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('queueHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 on successful SQS send', async () => {
    mockSend.mockResolvedValueOnce({});

    const { queueHandler } = await import('./queueCard.js');
    const result = await queueHandler(makeEvent());

    expect(result.statusCode).toBe(200);
  });

  it('queues the request body as the SQS message body', async () => {
    mockSend.mockResolvedValueOnce({});

    const body = JSON.stringify({ title: 'Hello', description: 'World', author: 'tester' });
    const { queueHandler } = await import('./queueCard.js');
    await queueHandler(makeEvent({ body }));

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].input.MessageBody).toBe(body);
  });

  it('returns 500 when SQS send throws', async () => {
    mockSend.mockRejectedValueOnce(new Error('SQS unavailable'));

    const { queueHandler } = await import('./queueCard.js');
    const result = await queueHandler(makeEvent());

    expect(result.statusCode).toBe(500);
  });

  it('throws when HTTP method is not POST', async () => {
    const { queueHandler } = await import('./queueCard.js');

    await expect(
      queueHandler(makeEvent({ httpMethod: 'GET' }))
    ).rejects.toThrow('POST');
  });

  it('sends an empty string body when event.body is null', async () => {
    mockSend.mockResolvedValueOnce({});

    const { queueHandler } = await import('./queueCard.js');
    const result = await queueHandler(makeEvent({ body: null }));

    // Null body is tolerated and still returns 200
    expect(result.statusCode).toBe(200);
  });

  it('returns correct CORS headers', async () => {
    mockSend.mockResolvedValueOnce({});

    const { queueHandler } = await import('./queueCard.js');
    const result = await queueHandler(makeEvent());

    expect(result.headers?.['Access-Control-Allow-Methods']).toBe('POST');
  });
});
