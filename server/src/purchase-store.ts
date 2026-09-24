/**
 * In-memory purchase store.
 * Tracks purchase records keyed by purchaseId.
 *
 * In production this would be backed by a database, but for the self-hosted
 * server a per-process map is sufficient. Purchases are lightweight and
 * short-lived (paid → fulfilled within minutes).
 */

export type PurchaseStatus = 'pending' | 'paid' | 'fulfilled' | 'failed';

export interface PurchaseRecord {
  purchaseId: string;
  key: string;
  cardCount: number;
  price: number;
  currency: string;
  providerCheckoutId: string;
  status: PurchaseStatus;
  createdAt: number;
  updatedAt: number;
  /**
   * The fulfillment token issued for this purchase, once payment is confirmed.
   * Stored here so that repeated status-polls return the same token rather than
   * generating a new one per call (which would allow token proliferation).
   */
  fulfillmentToken?: string;
}

const purchases = new Map<string, PurchaseRecord>();

export function createPurchaseRecord(record: Omit<PurchaseRecord, 'status' | 'createdAt' | 'updatedAt'>): PurchaseRecord {
  const now = Date.now();
  const full: PurchaseRecord = { ...record, status: 'pending', createdAt: now, updatedAt: now };
  purchases.set(record.purchaseId, full);
  return full;
}

export function getPurchaseRecord(purchaseId: string): PurchaseRecord | undefined {
  return purchases.get(purchaseId);
}

export function updatePurchaseStatus(purchaseId: string, status: PurchaseStatus): PurchaseRecord | undefined {
  const record = purchases.get(purchaseId);
  if (!record) return undefined;
  record.status = status;
  record.updatedAt = Date.now();
  return record;
}

/**
 * Atomically mark a purchase as paid and store its fulfillment token.
 * Idempotent: if the record is already 'paid' or 'fulfilled', returns the
 * existing token without overwriting it, preventing token proliferation on
 * repeated status polls.
 */
export function markPaidWithToken(purchaseId: string, token: string): PurchaseRecord | undefined {
  const record = purchases.get(purchaseId);
  if (!record) return undefined;
  if (record.status === 'paid' || record.status === 'fulfilled') {
    // Already issued — return without overwriting
    return record;
  }
  record.status = 'paid';
  record.fulfillmentToken = token;
  record.updatedAt = Date.now();
  return record;
}
