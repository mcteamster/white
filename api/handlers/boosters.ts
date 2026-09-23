import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createHmac, randomBytes, createHmac as hmac } from 'crypto';
import { getBoosterConfig } from '../lib/boosters';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://blankwhite.cards',
  'Access-Control-Allow-Methods': 'POST',
  'Content-Type': 'application/json',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const VALID_IMAGE_CHECKSUM = 250000;
const FULFILLMENT_TTL_SECS = 60 * 60;

// ── Shared helpers ────────────────────────────────────────────────────────────

function getSecret(): string {
  return process.env.BOOSTER_FULFILLMENT_SECRET || '';
}

function toBase64url(s: string): string {
  return Buffer.from(s, 'utf-8').toString('base64url');
}

function fromBase64url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf-8');
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** In-Lambda consumed nonces (per cold start — stateless replay protection) */
const consumedNonces = new Set<string>();

interface FulfillmentClaims {
  purchaseId: string;
  key: string;
  cardCount: number;
  exp: number;
  nonce: string;
}

function issueFulfillmentToken(purchaseId: string, key: string, cardCount: number, secret: string): string {
  const exp = Math.floor(Date.now() / 1000) + FULFILLMENT_TTL_SECS;
  const nonce = randomBytes(16).toString('hex');
  const claims: FulfillmentClaims = { purchaseId, key, cardCount, exp, nonce };
  const payload = toBase64url(JSON.stringify(claims));
  const sig = signPayload(payload, secret);
  return `${payload}.${sig}`;
}

type VerifyResult =
  | { ok: true; claims: FulfillmentClaims }
  | { ok: false; reason: string };

function verifyFulfillmentToken(token: string, secret: string): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'invalid_format' };
  const [payload, sig] = parts;
  if (!timingSafeEqual(sig, signPayload(payload, secret))) return { ok: false, reason: 'tampered' };
  let claims: FulfillmentClaims;
  try { claims = JSON.parse(fromBase64url(payload)) as FulfillmentClaims; }
  catch { return { ok: false, reason: 'invalid_format' }; }
  if (Math.floor(Date.now() / 1000) > claims.exp) return { ok: false, reason: 'expired' };
  if (consumedNonces.has(claims.nonce)) return { ok: false, reason: 'replayed' };
  return { ok: true, claims };
}

function validateCardContent(content: { title: string; description: string; author: string; image?: string }) {
  if (!content.title || content.title.length < 1 || content.title.length > 50) return false;
  if (!content.description || content.description.length < 1 || content.description.length > 140) return false;
  if (!content.author || content.author.length < 1 || content.author.length > 25) return false;
  if (content.image) {
    if (content.image.startsWith('data:image/')) return false;
    const checksum = content.image.split('').reduce((t, c) => t + (c.charCodeAt(0) - 32), 0);
    if (checksum !== VALID_IMAGE_CHECKSUM) return false;
  }
  return true;
}

interface GeneratedCard {
  content: { title: string; description: string; author: string; image?: string };
  location: 'deck';
}

async function generateCards(theme: string, count: number, packKey: string): Promise<GeneratedCard[]> {
  const apiKey = process.env.AI_API_KEY;
  const apiBase = process.env.AI_API_BASE || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const author = packKey.slice(0, 25);

  if (!apiKey) {
    // Sandbox: return stub cards
    return Array.from({ length: count }, (_, i) => ({
      content: { title: `${theme} Card ${i + 1}`.slice(0, 50), description: `A themed card from the ${theme} booster pack.`.slice(0, 140), author },
      location: 'deck' as const,
    }));
  }

  const prompt = `Generate exactly ${count} Blank White Cards themed around: "${theme}". Author all cards as "${author}". Return JSON: { "cards": [ { "title": "...", "description": "...", "author": "..." } ] }`;
  const systemPrompt = `You generate content for "Blank White Cards". Each card: title (1-50 chars), description/rule (1-140 chars), author (max 25 chars). Return JSON.`;

  try {
    const res = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.9 }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`AI API ${res.status}`);
    const data = await res.json() as { choices: { message: { content: string } }[] };
    const cards = (JSON.parse(data.choices[0].message.content) as { cards: { title: string; description: string; author: string }[] }).cards;
    return cards.slice(0, count).map(c => ({ content: { ...c, author: c.author?.slice(0, 25) || author }, location: 'deck' as const }));
  } catch { return []; }
}

// ── POST /v1/boosters/purchase ──────────────────────────────────────────────

export const purchaseBoosterHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const secret = getSecret();
  if (!secret) return { statusCode: 503, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Boosters not configured' }) };

  let key: string | undefined;
  try { key = (JSON.parse(event.body || '{}') as { key?: string }).key; }
  catch { return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  if (!key) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing key' }) };

  const pack = getBoosterConfig().find(p => p.key === key);
  if (!pack) return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: `Unknown pack: ${key}` }) };

  const purchaseId = randomBytes(16).toString('hex');
  // Sandbox: auto-issue fulfillment token (real adapter would return provider checkout info)
  const fulfillmentToken = issueFulfillmentToken(purchaseId, pack.key, pack.cardCount, secret);

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ purchaseId, paymentInfo: `sandbox:paid`, fulfillmentToken }),
  };
};

// ── GET /v1/boosters/fulfill/{token} ───────────────────────────────────────

export const fulfillBoosterHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const secret = getSecret();
  if (!secret) return { statusCode: 503, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Boosters not configured' }) };

  const token = event.pathParameters?.token;
  if (!token) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing token' }) };

  const verifyResult = verifyFulfillmentToken(decodeURIComponent(token), secret);
  if (!verifyResult.ok) {
    const statusMap: Record<string, number> = { invalid_format: 400, tampered: 400, expired: 410, replayed: 409 };
    return { statusCode: statusMap[verifyResult.reason] ?? 400, headers: CORS_HEADERS, body: JSON.stringify({ error: `Authorization ${verifyResult.reason}` }) };
  }

  const { claims } = verifyResult;
  const pack = getBoosterConfig().find(p => p.key === claims.key);
  if (!pack) return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: `Pack not found: ${claims.key}` }) };

  // Generate cards with bounded retries
  const validCards: GeneratedCard[] = [];
  for (let attempt = 0; attempt < 3 && validCards.length < claims.cardCount; attempt++) {
    const needed = claims.cardCount - validCards.length;
    const generated = await generateCards(pack.theme, Math.min(needed, 5), pack.key);
    for (const card of generated) {
      if (validateCardContent(card.content)) {
        validCards.push(card);
        if (validCards.length >= claims.cardCount) break;
      }
    }
  }

  if (validCards.length < claims.cardCount) {
    return { statusCode: 503, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Card generation failed — please retry. You have not been charged.' }) };
  }

  // Sign payload and consume token
  consumedNonces.add(claims.nonce);
  const cardsJson = JSON.stringify(validCards);
  const signature = hmac('sha256', secret).update(`${claims.purchaseId}|${pack.key}|${cardsJson}`).digest('hex');

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ purchaseId: claims.purchaseId, key: pack.key, cards: validCards, signature }),
  };
};
