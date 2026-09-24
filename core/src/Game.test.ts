/**
 * Tests for BlankWhiteCards Game.ts
 */

import { describe, test, expect } from 'vitest';
import { Client } from '../../engine/packages/client.ts';
import { BlankWhiteCards } from './Game.ts';
import type { Card } from './Cards.ts';

// ── moveCard with target: 'box' ───────────────────────────────────────────────

describe('moveCard → box', () => {
  function makeClientWithCard() {
    const client = Client({
      game: BlankWhiteCards,
      playerID: '0',
      singleplayer: true,
    });
    client.start();

    client.moves.submitCard({
      id: 0,
      content: { title: 'Test Card', description: 'desc', author: 'ghost' },
      location: 'hand',
      owner: '0',
      timestamp: Date.now(),
    });

    const state = client.getState()!;
    const cards: Card[] = state.G.cards;
    const cardInHand = cards.find((c: Card) => c.location === 'hand' && c.owner === '0');
    return { client, cardInHand };
  }

  test('6.1 moveCard with target "box" does not return INVALID_MOVE', () => {
    const { client, cardInHand } = makeClientWithCard();
    expect(cardInHand).toBeDefined();

    client.moves.moveCard(cardInHand!.id, 'box');

    const stateAfter = client.getState()!;
    const movedCard = stateAfter.G.cards.find((c: Card) => c.id === cardInHand!.id);
    expect(movedCard).toBeDefined();
    // If INVALID_MOVE had fired, the card would still be in 'hand'
    expect(movedCard!.location).not.toBe('hand');
  });

  test('6.2 card location is "box" after moveCard(id, "box")', () => {
    const { client, cardInHand } = makeClientWithCard();
    expect(cardInHand).toBeDefined();

    client.moves.moveCard(cardInHand!.id, 'box');

    const after = client.getState()!.G.cards;
    const boxed = after.find((c: Card) => c.id === cardInHand!.id);
    expect(boxed).toBeDefined();
    expect(boxed!.location).toBe('box');
  });

  test('6.3 card owner is undefined after moveCard(id, "box")', () => {
    const { client, cardInHand } = makeClientWithCard();
    expect(cardInHand).toBeDefined();
    expect(cardInHand!.owner).toBe('0');

    client.moves.moveCard(cardInHand!.id, 'box');

    const after = client.getState()!.G.cards;
    const boxed = after.find((c: Card) => c.id === cardInHand!.id);
    expect(boxed).toBeDefined();
    expect(boxed!.owner).toBeUndefined();
  });

  test('6.4 card in box is skipped by shuffleCards (remains in box after reshuffle)', () => {
    const { client, cardInHand } = makeClientWithCard();
    expect(cardInHand).toBeDefined();

    client.moves.moveCard(cardInHand!.id, 'box');

    // Verify it's boxed first
    const midState = client.getState()!.G.cards;
    const boxed = midState.find((c: Card) => c.id === cardInHand!.id);
    expect(boxed?.location).toBe('box');

    // Now shuffle — host (player 0) can call shuffleCards
    client.moves.shuffleCards();

    const after = client.getState()!.G.cards;
    const afterShuffle = after.find((c: Card) => c.id === cardInHand!.id);
    expect(afterShuffle).toBeDefined();
    expect(afterShuffle!.location).toBe('box');
  });
});
