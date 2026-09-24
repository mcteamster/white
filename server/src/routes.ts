import type { Server } from '@mcteamster/white-engine/server';
import { presetDecks } from '@mcteamster/white-core';
import { loadPresets } from './presets';
import { loadBoosters } from './boosters';
import { SandboxPaymentAdapter } from './payment';
import { createPurchaseRecord, getPurchaseRecord, updatePurchaseStatus, markPaidWithToken } from './purchase-store';
import { issueFulfillmentToken, verifyFulfillmentToken, consumeToken } from './fulfillment-auth';
import { fulfillBoosterPack } from './fulfillment';
import { randomUUID } from 'crypto';
import koaBody from 'koa-body';

type ServerInstance = ReturnType<typeof Server>;

export function registerRoutes(server: ServerInstance) {
  const presetConfig = loadPresets(process.env.PRESETS_CONFIG || './src/presets.json');
  const boosterConfig = loadBoosters(process.env.BOOSTERS_CONFIG || './src/boosters.json');

  // Signing secret for fulfillment authorizations — required for purchase/fulfill to work.
  // If not set, those routes return 503. GET /boosters still works (empty catalog when unconfigured).
  const fulfillmentSecret = process.env.BOOSTER_FULFILLMENT_SECRET || '';

  // Payment adapter — use real adapter when PAYMENT_ADAPTER=stripe (or similar) is set
  const paymentAdapter = new SandboxPaymentAdapter();

  // Deck export endpoint
  server.router.get('/export/:matchID', async (ctx) => {
    try {
      const { matchID } = ctx.params;
      const { state } = await server.db.fetch(matchID, { state: true });

      if (!state || !state.G || !state.G.cards) {
        ctx.status = 404;
        ctx.body = { error: 'Match not found or no cards' };
        return;
      }

      const strippedCards = state.G.cards.map((card: any) => ({
        id: card.id,
        content: card.content,
        location: (card.location === 'box') ? 'box' : 'deck',
        likes: (card?.likes && card.likes > 0 && card.likes < 1_000_000_000) ? card.likes : undefined,
      }));

      const strippedRules = (state.G.rules && state.G.rules.length > 0)
        ? state.G.rules.map((r: any) => ({ id: r.id, text: r.text, timestamp: r.timestamp }))
        : undefined;

      const deckObj: { cards: typeof strippedCards, rules?: typeof strippedRules } = { cards: strippedCards };
      if (strippedRules) deckObj.rules = strippedRules;

      const rawData = btoa(encodeURI(JSON.stringify(deckObj)));

      console.log(`Deck exported: ${matchID} (${strippedCards.length} cards)`);

      ctx.set('Content-Type', 'text/plain');
      ctx.body = rawData;
    } catch (error) {
      console.error('Deck export failed:', error);
      ctx.status = 500;
      ctx.body = { error: 'Failed to export deck' };
    }
  });

  // Presets endpoint — returns available preset decks with metadata
  server.router.get('/presets', (ctx) => {
    const presets = presetConfig.map(({ key, name, description, icon }) => {
      const cards = presetDecks[key]?.cards?.length ?? 0;
      return {
        key,
        name,
        description: description.replace('${cards}', String(cards)),
        icon,
        cards,
      };
    });
    ctx.body = { presets };
  });

  // GET /boosters — catalog of available booster packs (no server-side fields like theme)
  server.router.get('/boosters', (ctx) => {
    const boosters = boosterConfig.map(({ key, name, description, icon, cardCount, price, currency }) => ({
      key, name, description, icon, cardCount, price, currency,
    }));
    ctx.body = { boosters };
  });

  // POST /boosters/purchase — initiate a purchase for a pack
  server.router.post('/boosters/purchase', koaBody(), async (ctx) => {
    if (!fulfillmentSecret) {
      ctx.status = 503;
      ctx.body = { error: 'Booster purchases are not configured on this server' };
      return;
    }

    const body = ctx.request.body as { key?: string } | undefined;
    const key = body?.key;
    if (!key) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required field: key' };
      return;
    }

    const pack = boosterConfig.find(p => p.key === key);
    if (!pack) {
      ctx.status = 404;
      ctx.body = { error: `Unknown booster pack: ${key}` };
      return;
    }

    const purchaseId = randomUUID();
    let checkout;
    try {
      checkout = await paymentAdapter.createCheckout(
        purchaseId,
        pack.price,
        pack.currency,
        `${pack.name} — ${pack.cardCount} cards`,
      );
    } catch (err) {
      console.error('[boosters] Failed to create checkout:', err);
      ctx.status = 502;
      ctx.body = { error: 'Payment provider error' };
      return;
    }

    createPurchaseRecord({
      purchaseId,
      key: pack.key,
      cardCount: pack.cardCount,
      price: pack.price,
      currency: pack.currency,
      providerCheckoutId: checkout.providerCheckoutId,
    });

    ctx.status = 200;
    ctx.body = {
      purchaseId,
      paymentInfo: checkout.paymentInfo,
    };
  });

  // GET /boosters/fulfill/:token — verify payment, generate cards, return signed payload
  server.router.get('/boosters/fulfill/:token', async (ctx) => {
    if (!fulfillmentSecret) {
      ctx.status = 503;
      ctx.body = { error: 'Booster fulfillment is not configured on this server' };
      return;
    }

    const { token } = ctx.params;
    const verifyResult = verifyFulfillmentToken(token, fulfillmentSecret);
    if (!verifyResult.ok) {
      const statusMap = { invalid_format: 400, tampered: 400, expired: 410, replayed: 409 } as const;
      ctx.status = statusMap[verifyResult.reason] ?? 400;
      ctx.body = { error: `Authorization ${verifyResult.reason}` };
      return;
    }

    const { claims } = verifyResult;
    const purchase = getPurchaseRecord(claims.purchaseId);
    if (!purchase) {
      ctx.status = 404;
      ctx.body = { error: 'Purchase not found' };
      return;
    }

    // Verify payment server-side against provider
    let paymentStatus;
    try {
      paymentStatus = await paymentAdapter.getPaymentStatus(purchase.providerCheckoutId);
    } catch (err) {
      console.error('[boosters] Failed to check payment status:', err);
      ctx.status = 502;
      ctx.body = { error: 'Payment provider error' };
      return;
    }

    if (!paymentStatus.paid) {
      ctx.status = 402;
      ctx.body = { error: `Payment not confirmed (status: ${paymentStatus.status})` };
      return;
    }

    const pack = boosterConfig.find(p => p.key === claims.key);
    if (!pack) {
      ctx.status = 404;
      ctx.body = { error: `Pack no longer available: ${claims.key}` };
      return;
    }

    // Generate cards — do NOT consume token until delivery succeeds
    const payload = await fulfillBoosterPack(pack, claims.purchaseId, fulfillmentSecret);
    if (!payload) {
      // Generation failed — authorization NOT consumed (retryable)
      ctx.status = 503;
      ctx.body = { error: 'Card generation failed — please retry. Your payment has not been charged.' };
      return;
    }

    // Successful delivery — consume the token to prevent replay
    consumeToken(claims);
    updatePurchaseStatus(claims.purchaseId, 'fulfilled');

    ctx.status = 200;
    ctx.body = payload;
  });

  // POST /boosters/webhook — payment provider webhook to mark a purchase as paid
  // In production, verify the provider's webhook signature here before trusting the body.
  server.router.post('/boosters/webhook', koaBody(), async (ctx) => {
    if (!fulfillmentSecret) {
      ctx.status = 503;
      ctx.body = { error: 'Boosters not configured' };
      return;
    }

    const body = ctx.request.body as { purchaseId?: string; providerCheckoutId?: string } | undefined;
    const purchaseId = body?.purchaseId;
    if (!purchaseId) {
      ctx.status = 400;
      ctx.body = { error: 'Missing purchaseId' };
      return;
    }

    const purchase = getPurchaseRecord(purchaseId);
    if (!purchase) {
      ctx.status = 404;
      ctx.body = { error: 'Purchase not found' };
      return;
    }

    // Verify payment server-side, never trust the webhook body alone
    let paymentStatus;
    try {
      paymentStatus = await paymentAdapter.getPaymentStatus(purchase.providerCheckoutId);
    } catch (err) {
      console.error('[boosters] Webhook: failed to verify payment:', err);
      ctx.status = 502;
      ctx.body = { error: 'Payment provider error' };
      return;
    }

    if (!paymentStatus.paid) {
      ctx.status = 200;
      ctx.body = { status: 'not_yet_paid' };
      return;
    }

    // Issue fulfillment token (the client polls or uses this to fulfill)
    const pack = boosterConfig.find(p => p.key === purchase.key);
    if (!pack) {
      ctx.status = 404;
      ctx.body = { error: `Pack not found: ${purchase.key}` };
      return;
    }

    // Generate a token only once per purchase — idempotent on repeated webhook calls
    const existingRecord = getPurchaseRecord(purchaseId)!;
    let fulfillmentToken: string;
    if (existingRecord.fulfillmentToken) {
      fulfillmentToken = existingRecord.fulfillmentToken;
    } else {
      fulfillmentToken = issueFulfillmentToken(
        purchase.purchaseId,
        purchase.key,
        purchase.cardCount,
        fulfillmentSecret,
      );
      markPaidWithToken(purchaseId, fulfillmentToken);
    }

    ctx.status = 200;
    ctx.body = { fulfillmentToken };
  });

  // POST /boosters/status — client polls for fulfillment token after payment
  server.router.post('/boosters/status', koaBody(), async (ctx) => {
    if (!fulfillmentSecret) {
      ctx.status = 503;
      ctx.body = { error: 'Boosters not configured' };
      return;
    }

    const body = ctx.request.body as { purchaseId?: string } | undefined;
    const purchaseId = body?.purchaseId;
    if (!purchaseId) {
      ctx.status = 400;
      ctx.body = { error: 'Missing purchaseId' };
      return;
    }

    const purchase = getPurchaseRecord(purchaseId);
    if (!purchase) {
      ctx.status = 404;
      ctx.body = { error: 'Purchase not found' };
      return;
    }

    // Verify payment server-side
    let paymentStatus;
    try {
      paymentStatus = await paymentAdapter.getPaymentStatus(purchase.providerCheckoutId);
    } catch (err) {
      console.error('[boosters] Status check: payment verify error:', err);
      ctx.status = 502;
      ctx.body = { error: 'Payment provider error' };
      return;
    }

    if (!paymentStatus.paid) {
      ctx.status = 200;
      ctx.body = { status: 'pending' };
      return;
    }

    const pack = boosterConfig.find(p => p.key === purchase.key);
    if (!pack) {
      ctx.status = 404;
      ctx.body = { error: `Pack not found: ${purchase.key}` };
      return;
    }

    // Issue the token only once per purchase — idempotent on repeated polls.
    // Prevents token proliferation: multiple polls while paid would otherwise
    // each return a distinct, independently usable token.
    const currentRecord = getPurchaseRecord(purchaseId)!;
    let fulfillmentToken: string;
    if (currentRecord.fulfillmentToken) {
      fulfillmentToken = currentRecord.fulfillmentToken;
    } else {
      fulfillmentToken = issueFulfillmentToken(
        purchase.purchaseId,
        purchase.key,
        purchase.cardCount,
        fulfillmentSecret,
      );
      markPaidWithToken(purchaseId, fulfillmentToken);
    }

    ctx.status = 200;
    ctx.body = { status: 'paid', fulfillmentToken };
  });
}
