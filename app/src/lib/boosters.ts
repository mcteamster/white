/**
 * Booster pack API client — fetch catalog, purchase, poll status, and fulfill.
 */
import type { BoosterPack, BoostersResponse } from '@mcteamster/white-core';
export type { BoosterPack };

/** Custom server URL from localStorage (mirrors clients.ts getCustomServer pattern) */
function getServerBase(): string {
  return localStorage.getItem('customServerUrl') || '';
}

/**
 * Fetch the booster catalog from the server.
 * Returns empty array on any error (catalog unavailable → hide store).
 */
export async function fetchBoosters(): Promise<BoosterPack[]> {
  try {
    const base = getServerBase();
    const url = base ? `${base}/boosters` : '/boosters';
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const data = await res.json() as BoostersResponse;
    if (!Array.isArray(data.boosters)) return [];
    return data.boosters;
  } catch {
    return [];
  }
}

export interface PurchaseResponse {
  purchaseId: string;
  paymentInfo: string;
}

/**
 * Initiate a booster pack purchase.
 */
export async function purchaseBooster(key: string): Promise<PurchaseResponse> {
  const base = getServerBase();
  const url = base ? `${base}/boosters/purchase` : '/boosters/purchase';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<PurchaseResponse>;
}

export interface StatusResponse {
  status: 'pending' | 'paid';
  fulfillmentToken?: string;
}

/**
 * Poll for payment confirmation and fulfillment token.
 */
export async function checkPurchaseStatus(purchaseId: string): Promise<StatusResponse> {
  const base = getServerBase();
  const url = base ? `${base}/boosters/status` : '/boosters/status';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purchaseId }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<StatusResponse>;
}

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
  signature: string;
}

/**
 * Redeem a fulfillment token to get the signed deck payload.
 */
export async function fulfillBooster(token: string): Promise<FulfilledPayload> {
  const base = getServerBase();
  const url = base ? `${base}/boosters/fulfill/${encodeURIComponent(token)}` : `/boosters/fulfill/${encodeURIComponent(token)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000) }); // Long timeout: AI generation
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<FulfilledPayload>;
}

/**
 * Format a price in minor currency units for display.
 * E.g. formatPrice(499, 'USD') → '$4.99'
 */
export function formatPrice(minorUnits: number, currency: string): string {
  try {
    const major = minorUnits / 100;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${minorUnits} ${currency}`;
  }
}
