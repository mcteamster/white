// Booster Pack Types

/**
 * A booster pack is a purchasable bundle of AI-generated themed cards.
 * This type is shared between server, api, and client.
 */
export interface BoosterPack {
  /** Unique key for this pack — used in purchase and fulfillment requests */
  key: string;
  /** Display name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Icon identifier or emoji for the store UI */
  icon: string;
  /** Number of cards in the pack */
  cardCount: number;
  /** Price in minor currency units (e.g. cents for USD) */
  price: number;
  /** ISO 4217 currency code (e.g. "USD") */
  currency: string;
}

/**
 * Extended booster pack config that includes server-side-only fields.
 * The `theme` field drives AI generation and must never be sent to clients.
 */
export interface BoosterPackConfig extends BoosterPack {
  /** AI generation theme/prompt guidance — server-side only */
  theme: string;
}

/**
 * Response shape for GET /boosters
 */
export interface BoostersResponse {
  boosters: BoosterPack[];
}
