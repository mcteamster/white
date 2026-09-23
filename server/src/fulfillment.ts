import { createHmac } from 'crypto';
import { generateCards, validateGeneratedCard, sanitiseGeneratedImage } from './generate';
import type { BoosterPackConfig } from './boosters';

/**
 * Booster pack fulfillment — generates cards and returns a signed deck payload.
 *
 * The signed payload proves to the client that the cards came from the server
 * and correspond to the paid purchaseId + pack key.
 */

export interface FulfilledCard {
  content: {
    title: string;
    description: string;
    author: string;
    image?: string;
  };
  location: 'deck';
}

export interface FulfilledPayload {
  purchaseId: string;
  key: string;
  cards: FulfilledCard[];
  /** HMAC-SHA256(purchaseId|key|cardsHash, FULFILLMENT_SECRET) as hex */
  signature: string;
}

/** Max generation attempts per card to hit the required count */
const MAX_RETRIES = 3;
/** Max concurrent card generations */
const GENERATION_CONCURRENCY = 5;

/**
 * Generate exactly pack.cardCount valid cards for the pack, then sign the payload.
 *
 * Returns null if it cannot produce a valid payload after retries
 * (caller should NOT consume the fulfillment token in this case).
 */
export async function fulfillBoosterPack(
  pack: BoosterPackConfig,
  purchaseId: string,
  secret: string,
): Promise<FulfilledPayload | null> {
  const requiredCount = pack.cardCount;
  const validCards: FulfilledCard[] = [];
  let attempt = 0;

  while (validCards.length < requiredCount && attempt < MAX_RETRIES) {
    attempt++;
    const needed = requiredCount - validCards.length;

    // Generate in parallel batches capped at GENERATION_CONCURRENCY
    const batchSize = Math.min(needed, GENERATION_CONCURRENCY);
    const generated = await generateCards(pack.theme, batchSize, pack.key);

    for (const raw of generated) {
      // Sanitise image first (drops invalid ones)
      const sanitised = sanitiseGeneratedImage(raw);
      const validation = validateGeneratedCard(sanitised);

      if (validation.valid) {
        validCards.push({
          content: {
            title: sanitised.title,
            description: sanitised.description,
            author: sanitised.author,
            image: sanitised.image,
          },
          location: 'deck',
        });
        if (validCards.length >= requiredCount) break;
      } else {
        console.warn(`[boosters] Generated card failed validation (attempt ${attempt}): ${validation.error}`);
      }
    }
  }

  if (validCards.length < requiredCount) {
    console.error(
      `[boosters] Could not produce ${requiredCount} valid cards for pack "${pack.key}" ` +
      `after ${attempt} attempts (got ${validCards.length})`
    );
    return null;
  }

  // Sign the payload: HMAC over purchaseId|key|cardsJson
  const cardsJson = JSON.stringify(validCards);
  const sigPayload = `${purchaseId}|${pack.key}|${cardsJson}`;
  const signature = createHmac('sha256', secret).update(sigPayload).digest('hex');

  return { purchaseId, key: pack.key, cards: validCards, signature };
}

/**
 * Verify a fulfilled pack payload client-side (or server-side in tests).
 * Returns true if the signature is valid for the given secret.
 */
export function verifyPayloadSignature(
  payload: FulfilledPayload,
  secret: string,
): boolean {
  const cardsJson = JSON.stringify(payload.cards);
  const sigPayload = `${payload.purchaseId}|${payload.key}|${cardsJson}`;
  const expected = createHmac('sha256', secret).update(sigPayload).digest('hex');
  return payload.signature === expected;
}
