/**
 * Tests for BlankWhiteCards Game.ts
 *
 * Run with:
 *   node_modules/.bin/tsx core/src/Game.test.ts
 * from the repo root.
 */

import assert from 'node:assert/strict';
import { Client } from '../../engine/packages/client.ts';
import { BlankWhiteCards } from './Game.ts';
import type { Card } from './Cards.ts';
import { INVALID_MOVE } from '../../engine/packages/core.ts';

// ── Test helpers ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: unknown) {
    console.error(`  ✗ ${name}`);
    if (err instanceof Error) {
      console.error(`    ${err.message}`);
    }
    failed++;
  }
}

// ── moveCard with target: 'box' ───────────────────────────────────────────────

console.log('\nmoveCard → box\n');

// Build a minimal client with one card in the deck
function makeClient() {
  const client = Client({
    game: BlankWhiteCards,
    playerID: '0',
    singleplayer: true,
  });
  client.start();

  // Inject a card directly into state so we have something to move
  const card: Card = {
    id: 1,
    content: { title: 'Test Card', description: 'desc', author: 'ghost' },
    location: 'hand',
    owner: '0',
    timestamp: Date.now(),
  };
  // Access internal store to seed card — use a loadCards move
  // We'll submit a card, then claim it to put it in hand
  // Actually: use the internal store mutation (singleplayer mode exposes store)
  // Simplest: use the submitted-card approach via submitCard then work from there.
  // But submitCard puts the card in hand already if we pass owner. Let's use moveCard
  // from a pre-seeded state. We seed via the setup data workaround: instead, just
  // call submitCard which adds the card to hand, then test box from hand.
  return { client, card };
}

test('6.1 moveCard with target "box" does not return INVALID_MOVE', () => {
  const client = Client({
    game: BlankWhiteCards,
    playerID: '0',
    singleplayer: true,
  });
  client.start();

  // Submit a card so it lands in hand
  client.moves.submitCard({
    id: 0,
    content: { title: 'Test Card', description: 'A test', author: 'ghost' },
    location: 'hand',
    owner: '0',
    timestamp: Date.now(),
  });

  const stateBefore = client.getState();
  assert.ok(stateBefore, 'state must exist');
  const cards: Card[] = stateBefore!.G.cards;
  const cardInHand = cards.find((c: Card) => c.location === 'hand' && c.owner === '0');
  assert.ok(cardInHand, 'there should be a card in hand');

  // Move to box — must NOT return INVALID_MOVE
  client.moves.moveCard(cardInHand.id, 'box');

  const stateAfter = client.getState();
  assert.ok(stateAfter, 'state after must exist');
  // In singleplayer the move applies; verify via state not via move return value
  // (client moves are fire-and-forget in singleplayer mode — state reflects result)
  const movedCard = stateAfter!.G.cards.find((c: Card) => c.id === cardInHand.id);
  assert.ok(movedCard, 'card must still exist after move');
  // If INVALID_MOVE had fired the card would still be in 'hand'
  assert.notEqual(movedCard.location, 'hand', 'card should have moved away from hand (INVALID_MOVE would leave it there)');
});

test('6.2 card location is "box" after moveCard(id, "box")', () => {
  const client = Client({
    game: BlankWhiteCards,
    playerID: '0',
    singleplayer: true,
  });
  client.start();

  client.moves.submitCard({
    id: 0,
    content: { title: 'Box Test', description: 'retire me', author: 'ghost' },
    location: 'hand',
    owner: '0',
    timestamp: Date.now(),
  });

  const before = client.getState()!.G.cards;
  const card = before.find((c: Card) => c.location === 'hand' && c.owner === '0');
  assert.ok(card);

  client.moves.moveCard(card.id, 'box');

  const after = client.getState()!.G.cards;
  const boxed = after.find((c: Card) => c.id === card.id);
  assert.ok(boxed, 'card must exist after move');
  assert.equal(boxed.location, 'box', `expected location "box", got "${boxed.location}"`);
});

test('6.3 card owner is undefined after moveCard(id, "box")', () => {
  const client = Client({
    game: BlankWhiteCards,
    playerID: '0',
    singleplayer: true,
  });
  client.start();

  client.moves.submitCard({
    id: 0,
    content: { title: 'Owner Clear Test', description: 'clear me', author: 'ghost' },
    location: 'hand',
    owner: '0',
    timestamp: Date.now(),
  });

  const before = client.getState()!.G.cards;
  const card = before.find((c: Card) => c.location === 'hand' && c.owner === '0');
  assert.ok(card);
  assert.equal(card.owner, '0', 'owner should be "0" before move');

  client.moves.moveCard(card.id, 'box');

  const after = client.getState()!.G.cards;
  const boxed = after.find((c: Card) => c.id === card.id);
  assert.ok(boxed, 'card must exist after move');
  assert.equal(boxed.owner, undefined, `expected owner undefined, got "${boxed.owner}"`);
});

test('6.4 card in box is skipped by shuffleCards (remains in box after reshuffle)', () => {
  const client = Client({
    game: BlankWhiteCards,
    playerID: '0',
    singleplayer: true,
  });
  client.start();

  // Submit and retire a card
  client.moves.submitCard({
    id: 0,
    content: { title: 'Reshuffle Survivor', description: 'stay boxed', author: 'ghost' },
    location: 'hand',
    owner: '0',
    timestamp: Date.now(),
  });

  const before = client.getState()!.G.cards;
  const card = before.find((c: Card) => c.location === 'hand' && c.owner === '0');
  assert.ok(card);

  client.moves.moveCard(card.id, 'box');

  // Verify it's boxed first
  const midState = client.getState()!.G.cards;
  const boxed = midState.find((c: Card) => c.id === card.id);
  assert.equal(boxed?.location, 'box', 'card must be in box before shuffle');

  // Now shuffle — host (player 0) can call shuffleCards
  client.moves.shuffleCards();

  const after = client.getState()!.G.cards;
  const afterShuffle = after.find((c: Card) => c.id === card.id);
  assert.ok(afterShuffle, 'card must still exist after shuffle');
  assert.equal(afterShuffle.location, 'box', `card should remain in box after reshuffle, got "${afterShuffle.location}"`);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
