import { createHmac, randomBytes } from 'crypto';

/**
 * Fulfillment authorization — single-use, expiring HMAC token.
 *
 * Structure: base64url(purchaseId|key|cardCount|exp|nonce) + "." + hmac
 *
 * The HMAC covers purchaseId, key, cardCount, exp, and nonce, preventing
 * tampering with any of those fields. The nonce ensures each issued token
 * is unique even for the same purchase.
 */

export interface FulfillmentClaims {
  purchaseId: string;
  key: string;
  cardCount: number;
  exp: number; // Unix epoch seconds
  nonce: string;
}

/** Validity window for a fulfillment token: 1 hour */
const FULFILLMENT_TTL_SECS = 60 * 60;

/** In-memory set of consumed nonces. Shared per process (single-server OK). */
const consumedNonces = new Set<string>();

function toBase64url(s: string): string {
  return Buffer.from(s, 'utf-8').toString('base64url');
}

function fromBase64url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf-8');
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/**
 * Issue a signed, single-use fulfillment authorization token.
 */
export function issueFulfillmentToken(
  purchaseId: string,
  key: string,
  cardCount: number,
  secret: string,
): string {
  const exp = Math.floor(Date.now() / 1000) + FULFILLMENT_TTL_SECS;
  const nonce = randomBytes(16).toString('hex');
  const claims: FulfillmentClaims = { purchaseId, key, cardCount, exp, nonce };
  const payload = toBase64url(JSON.stringify(claims));
  const sig = signPayload(payload, secret);
  return `${payload}.${sig}`;
}

export type VerifyResult =
  | { ok: true; claims: FulfillmentClaims }
  | { ok: false; reason: 'invalid_format' | 'tampered' | 'expired' | 'replayed' };

/**
 * Verify a fulfillment token. Returns the claims if valid.
 * Does NOT consume the token — call consumeToken() separately on successful delivery.
 */
export function verifyFulfillmentToken(token: string, secret: string): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'invalid_format' };

  const [payload, sig] = parts;
  const expectedSig = signPayload(payload, secret);
  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(sig, expectedSig)) {
    return { ok: false, reason: 'tampered' };
  }

  let claims: FulfillmentClaims;
  try {
    claims = JSON.parse(fromBase64url(payload)) as FulfillmentClaims;
  } catch {
    return { ok: false, reason: 'invalid_format' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > claims.exp) {
    return { ok: false, reason: 'expired' };
  }

  if (consumedNonces.has(claims.nonce)) {
    return { ok: false, reason: 'replayed' };
  }

  return { ok: true, claims };
}

/**
 * Consume a token's nonce, preventing replay.
 * Call only after successful card delivery.
 */
export function consumeToken(claims: FulfillmentClaims): void {
  consumedNonces.add(claims.nonce);
}

/** Simple timing-safe string comparison (base64url strings are ASCII) */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
