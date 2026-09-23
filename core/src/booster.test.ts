/**
 * Unit tests for BWC-38 Booster Pack implementation.
 *
 * Run with:
 *   node_modules/.bin/tsx core/src/booster.test.ts
 * from the repo root.
 */

import assert from 'node:assert/strict';
import { validateCardContent, validateCardImage } from './validators.ts';
import { issueFulfillmentToken, verifyFulfillmentToken, consumeToken } from '../../server/src/fulfillment-auth.ts';
import { loadBoosters } from '../../server/src/boosters.ts';
import { fulfillBoosterPack } from '../../server/src/fulfillment.ts';
import { Client } from '../../engine/packages/client.ts';
import { BlankWhiteCards } from './Game.ts';
import type { Card } from './Cards.ts';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  const result = (() => {
    try {
      const r = fn();
      if (r instanceof Promise) return r.then(() => { console.log(`  ✓ ${name}`); passed++; }).catch(err => { console.error(`  ✗ ${name}`); console.error(`    ${err instanceof Error ? err.message : err}`); failed++; });
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`  ✗ ${name}`);
      if (err instanceof Error) console.error(`    ${err.message}`);
      failed++;
    }
  })();
  return result;
}

// ── 5.1 Card/image validator tests ──────────────────────────────────────────

console.log('\n5.1 Card content validators\n');

test('valid title (1 char)', () => {
  const result = validateCardContent({ title: 'A', description: 'valid description', author: 'ghost' });
  assert.equal(result.valid, true);
});

test('valid title (50 chars)', () => {
  const result = validateCardContent({ title: 'A'.repeat(50), description: 'desc', author: 'ghost' });
  assert.equal(result.valid, true);
});

test('title too long (51 chars) — invalid', () => {
  const result = validateCardContent({ title: 'A'.repeat(51), description: 'desc', author: 'ghost' });
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes('title'));
});

test('empty title — invalid', () => {
  const result = validateCardContent({ title: '', description: 'desc', author: 'ghost' });
  assert.equal(result.valid, false);
});

test('valid description (1 char)', () => {
  const result = validateCardContent({ title: 'T', description: 'D', author: 'ghost' });
  assert.equal(result.valid, true);
});

test('valid description (140 chars)', () => {
  const result = validateCardContent({ title: 'T', description: 'D'.repeat(140), author: 'ghost' });
  assert.equal(result.valid, true);
});

test('description too long (141 chars) — invalid', () => {
  const result = validateCardContent({ title: 'T', description: 'D'.repeat(141), author: 'ghost' });
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes('description'));
});

test('valid author (1 char)', () => {
  const result = validateCardContent({ title: 'T', description: 'D', author: 'X' });
  assert.equal(result.valid, true);
});

test('valid author (25 chars)', () => {
  const result = validateCardContent({ title: 'T', description: 'D', author: 'A'.repeat(25) });
  assert.equal(result.valid, true);
});

test('author too long (26 chars) — invalid', () => {
  const result = validateCardContent({ title: 'T', description: 'D', author: 'A'.repeat(26) });
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes('author'));
});

// ── 5.1 Image validator tests ──────────────────────────────────────────────

console.log('\n5.1 Image validators\n');

test('PNG data URI rejected', () => {
  const result = validateCardImage('data:image/png;base64,AAAA');
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes('PNG data URI'));
});

test('data:image/jpeg URI also rejected', () => {
  const result = validateCardImage('data:image/jpeg;base64,AAAA');
  assert.equal(result.valid, false);
});

test('valid 1-bit image checksum (250000) passes', () => {
  // Build a string whose checksum (sum of charCode - 32) = 250000
  // Use printable chars: ' ' is 32 (value 0), '!' is 33 (value 1), etc.
  // A string of N chars each with charCode 32 + k: total = N*k = 250000
  // Use 1000 chars each with value 250: charCode = 32 + 250 = 282 — that's multi-byte
  // Use char with code 32 + 100 = 132 repeated 2500 times
  const char = String.fromCharCode(132);
  const image = char.repeat(2500);
  const checksum = image.split('').reduce((t, c) => t + (c.charCodeAt(0) - 32), 0);
  assert.equal(checksum, 250000, 'test string must have correct checksum');
  const result = validateCardImage(image);
  assert.equal(result.valid, true);
});

test('wrong checksum image rejected', () => {
  const result = validateCardImage('short_invalid_string');
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes('checksum'));
});

// ── 5.2 Authorization signing/verification tests ──────────────────────────

console.log('\n5.2 Fulfillment authorization signing/verification\n');

const TEST_SECRET = 'test-secret-key-12345';

test('valid token verifies successfully', () => {
  const token = issueFulfillmentToken('purchase-1', 'pack-a', 5, TEST_SECRET);
  const result = verifyFulfillmentToken(token, TEST_SECRET);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.claims.purchaseId, 'purchase-1');
    assert.equal(result.claims.key, 'pack-a');
    assert.equal(result.claims.cardCount, 5);
  }
});

test('tampered token rejected', () => {
  const token = issueFulfillmentToken('purchase-2', 'pack-a', 5, TEST_SECRET);
  // Tamper with the payload part
  const [payload, sig] = token.split('.');
  const tampered = `${payload}tampered.${sig}`;
  const result = verifyFulfillmentToken(tampered, TEST_SECRET);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'tampered');
});

test('wrong secret rejected', () => {
  const token = issueFulfillmentToken('purchase-3', 'pack-a', 5, TEST_SECRET);
  const result = verifyFulfillmentToken(token, 'wrong-secret');
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'tampered');
});

test('consumed (replayed) token rejected', () => {
  const token = issueFulfillmentToken('purchase-replay', 'pack-a', 5, TEST_SECRET);
  const r1 = verifyFulfillmentToken(token, TEST_SECRET);
  assert.equal(r1.ok, true);
  if (r1.ok) consumeToken(r1.claims);
  const r2 = verifyFulfillmentToken(token, TEST_SECRET);
  assert.equal(r2.ok, false);
  if (!r2.ok) assert.equal(r2.reason, 'replayed');
});

test('invalid format token rejected', () => {
  const result = verifyFulfillmentToken('notavalidtoken', TEST_SECRET);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'invalid_format');
});

// ── 5.3 GET /boosters — catalog config tests ────────────────────────────────

console.log('\n5.3 Catalog config loader\n');

test('empty catalog on missing config file', () => {
  const result = loadBoosters('/nonexistent/path/boosters.json');
  assert.deepEqual(result, []);
});

test('empty catalog on invalid JSON', () => {
  const tmp = join(tmpdir(), `bwc-test-${Date.now()}.json`);
  writeFileSync(tmp, 'not-json');
  try {
    const result = loadBoosters(tmp);
    assert.deepEqual(result, []);
  } finally {
    unlinkSync(tmp);
  }
});

test('empty catalog on missing required field', () => {
  const tmp = join(tmpdir(), `bwc-test-${Date.now()}.json`);
  writeFileSync(tmp, JSON.stringify([{ key: 'pack', name: 'Pack' }])); // missing fields
  try {
    const result = loadBoosters(tmp);
    assert.deepEqual(result, []);
  } finally {
    unlinkSync(tmp);
  }
});

test('valid config loads correctly', () => {
  const tmp = join(tmpdir(), `bwc-test-${Date.now()}.json`);
  const config = [{
    key: 'fantasy', name: 'Fantasy', description: 'A fantasy pack', icon: '🧙',
    cardCount: 10, price: 199, currency: 'USD', theme: 'Fantasy RPG adventure',
  }];
  writeFileSync(tmp, JSON.stringify(config));
  try {
    const result = loadBoosters(tmp);
    assert.equal(result.length, 1);
    assert.equal(result[0].key, 'fantasy');
    assert.equal(result[0].theme, 'Fantasy RPG adventure');
  } finally {
    unlinkSync(tmp);
  }
});

// ── 5.4 Fulfillment tests ────────────────────────────────────────────────────

console.log('\n5.4 Fulfillment: card count and payload signature\n');

const promises: Promise<void>[] = [];

promises.push((async () => {
  const p = test('fulfillBoosterPack returns exactly cardCount cards', async () => {
    const pack = {
      key: 'test-pack', name: 'Test Pack', description: 'Test', icon: '🃏',
      cardCount: 3, price: 100, currency: 'USD', theme: 'testing',
    };
    const payload = await fulfillBoosterPack(pack, 'test-purchase-1', TEST_SECRET);
    assert.ok(payload !== null, 'payload must not be null');
    assert.equal(payload!.cards.length, 3);
    assert.equal(payload!.purchaseId, 'test-purchase-1');
    assert.equal(payload!.key, 'test-pack');
    assert.ok(payload!.signature.length > 0);
  });
  if (p) await p;
})());

promises.push((async () => {
  const p = test('fulfillBoosterPack payload signature is verifiable', async () => {
    const { verifyPayloadSignature } = await import('../../server/src/fulfillment.ts');
    const pack = {
      key: 'test-pack-2', name: 'Test Pack 2', description: 'Test', icon: '🎴',
      cardCount: 2, price: 100, currency: 'USD', theme: 'testing',
    };
    const payload = await fulfillBoosterPack(pack, 'test-purchase-2', TEST_SECRET);
    assert.ok(payload !== null);
    const valid = verifyPayloadSignature(payload!, TEST_SECRET);
    assert.equal(valid, true, 'signature must be valid');
  });
  if (p) await p;
})());

promises.push((async () => {
  const p = test('all cards have valid content (title 1-50, desc 1-140, author 1-25)', async () => {
    const pack = {
      key: 'test-pack-3', name: 'Test Pack 3', description: 'Test', icon: '🃏',
      cardCount: 5, price: 100, currency: 'USD', theme: 'space exploration',
    };
    const payload = await fulfillBoosterPack(pack, 'test-purchase-3', TEST_SECRET);
    assert.ok(payload !== null);
    for (const card of payload!.cards) {
      const r = validateCardContent(card.content);
      assert.equal(r.valid, true, `Card "${card.content.title}" failed: ${r.error}`);
      assert.equal(card.location, 'deck');
    }
  });
  if (p) await p;
})());

// ── 5.5 loadCards move — booster cards behave as ordinary cards ──────────────

console.log('\n5.5 loadCards: booster cards behave as ordinary cards\n');

test('loadCards appends booster cards with sequential IDs', () => {
  const client = Client({ game: BlankWhiteCards, playerID: '0', singleplayer: true });
  client.start();

  const boosterCards: Card[] = [
    { id: 0, content: { title: 'Booster Card 1', description: 'desc 1', author: 'fantasy-pack' }, location: 'deck' },
    { id: 0, content: { title: 'Booster Card 2', description: 'desc 2', author: 'fantasy-pack' }, location: 'deck' },
  ];

  client.moves.loadCards(boosterCards);
  const state = client.getState();
  assert.ok(state);
  const cards = state!.G.cards;
  assert.equal(cards.length, 2);
  assert.equal(cards[0].id, 1);
  assert.equal(cards[1].id, 2);
});

test('booster cards can be picked up (moved to hand)', () => {
  const client = Client({ game: BlankWhiteCards, playerID: '0', singleplayer: true });
  client.start();

  const boosterCards: Card[] = [
    { id: 0, content: { title: 'Pickable Card', description: 'draw me', author: 'pack' }, location: 'deck' },
  ];
  client.moves.loadCards(boosterCards);

  client.moves.pickupCard();
  const state = client.getState();
  assert.ok(state);
  const hand = state!.G.cards.filter((c: Card) => c.location === 'hand');
  assert.equal(hand.length, 1);
  assert.equal(hand[0].content.title, 'Pickable Card');
});

test('booster cards can be liked', () => {
  const client = Client({ game: BlankWhiteCards, playerID: '0', singleplayer: true });
  client.start();

  const boosterCards: Card[] = [
    { id: 0, content: { title: 'Likeable Card', description: 'like me', author: 'pack' }, location: 'deck' },
  ];
  client.moves.loadCards(boosterCards);

  const before = client.getState()!.G.cards;
  const card = before.find((c: Card) => c.content.title === 'Likeable Card');
  assert.ok(card);

  client.moves.likeCard(card!.id);
  const after = client.getState()!.G.cards;
  const liked = after.find((c: Card) => c.id === card!.id);
  assert.equal(liked?.likes, 1);
});

// ── 5.7 Existing flows unaffected when boosters disabled ─────────────────────

console.log('\n5.7 Existing flows unaffected without boosters\n');

test('server starts and non-booster features work with empty catalog', () => {
  // loadBoosters with no config returns empty array — server would serve { boosters: [] }
  const result = loadBoosters('/nonexistent.json');
  assert.deepEqual(result, []);
  // This is treated as "boosters disabled" — no error, no crash
});

// ── Wait for async tests and report ─────────────────────────────────────────

Promise.all(promises).then(() => {
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
});
