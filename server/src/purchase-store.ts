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
