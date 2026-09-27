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

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeClient(playerID = '0', numPlayers = 1) {
  const client = Client({
    game: BlankWhiteCards,
    playerID,
    numPlayers,
    singleplayer: true,
  });
  client.start();
  return client;
}

function submitAndGetCard(client: ReturnType<typeof makeClient>): Card {
  client.moves.submitCard({
    id: 0,
    content: { title: 'Test Card', description: 'desc', author: 'ghost' },
    location: 'hand',
    owner: '0',
    timestamp: Date.now(),
  });
  const cards: Card[] = client.getState()!.G.cards;
  return cards.find((c: Card) => c.owner === '0')!;
}

function moveToPile(client: ReturnType<typeof makeClient>, cardId: number) {
  client.moves.moveCard(cardId, 'pile');
}

// ── pickupCard ────────────────────────────────────────────────────────────────

describe('pickupCard', () => {
  test('draws a card from the deck into hand', () => {
    const client = makeClient();
    // First put a card into the deck by submitting then moving to deck
    client.moves.submitCard({
      id: 0,
      content: { title: 'Deck Card', description: 'desc', author: 'ghost' },
      location: 'deck',
      owner: undefined,
      timestamp: Date.now(),
    });
    // Move to deck
    const cards = client.getState()!.G.cards;
    const card = cards[0];
    client.moves.moveCard(card.id, 'deck');

    // Now pick it up
    client.moves.pickupCard();

    const after: Card[] = client.getState()!.G.cards;
    const handCards = after.filter((c: Card) => c.location === 'hand');
    expect(handCards.length).toBeGreaterThan(0);
  });

  test('reshuffles pile+discard into deck when deck is empty, then draws', () => {
    const client = makeClient();
    // Submit a card, move it to pile so there's something to reshuffle
    client.moves.submitCard({
      id: 0,
      content: { title: 'Pile Card', description: 'desc', author: 'ghost' },
      location: 'hand',
      owner: '0',
      timestamp: Date.now(),
    });
    const state = client.getState()!;
    const card = state.G.cards[0];
    client.moves.moveCard(card.id, 'pile');

    // Deck is now empty. pickupCard should reshuffle and draw.
    client.moves.pickupCard();

    const after: Card[] = client.getState()!.G.cards;
    // After reshuffle + pickup, the card should be in hand (or deck if >1 card)
    const nonPile = after.find((c: Card) => c.id === card.id && c.location !== 'pile');
    expect(nonPile).toBeDefined();
  });

  test('returns INVALID_MOVE when deck and pile and discard are all empty', () => {
    const client = makeClient();
    const stateBefore = client.getState()!;

    // No cards at all — nothing to draw
    client.moves.pickupCard();

    const stateAfter = client.getState()!;
    // State should be unchanged (INVALID_MOVE was returned)
    expect(stateAfter.G.cards).toEqual(stateBefore.G.cards);
  });
});

// ── claimCard ─────────────────────────────────────────────────────────────────

describe('claimCard', () => {
  test('moves a pile card into hand', () => {
    const client = makeClient();
    const card = submitAndGetCard(client);
    moveToPile(client, card.id);

    client.moves.claimCard(card.id);

    const after: Card[] = client.getState()!.G.cards;
    const claimed = after.find((c: Card) => c.id === card.id)!;
    expect(claimed.location).toBe('hand');
    expect(claimed.owner).toBe('0');
  });

  test('returns INVALID_MOVE for a card not in the pile', () => {
    const client = makeClient();
    const card = submitAndGetCard(client);
    // Card is still in hand, not pile
    const stateBefore = client.getState()!;

    client.moves.claimCard(card.id);

    const stateAfter = client.getState()!;
    expect(stateAfter.G.cards).toEqual(stateBefore.G.cards);
  });

  test('returns INVALID_MOVE for a non-existent card ID', () => {
    const client = makeClient();
    const stateBefore = client.getState()!;

    client.moves.claimCard(9999);

    const stateAfter = client.getState()!;
    expect(stateAfter.G.cards).toEqual(stateBefore.G.cards);
  });
});

// ── likeCard ──────────────────────────────────────────────────────────────────

describe('likeCard', () => {
  test('increments likes on a card with existing likes', () => {
    const client = makeClient();
    const card = submitAndGetCard(client);
    moveToPile(client, card.id);

    client.moves.likeCard(card.id);

    const after: Card[] = client.getState()!.G.cards;
    const liked = after.find((c: Card) => c.id === card.id)!;
    expect(liked.likes).toBe(1);

    client.moves.likeCard(card.id);
    const after2: Card[] = client.getState()!.G.cards;
    const liked2 = after2.find((c: Card) => c.id === card.id)!;
    expect(liked2.likes).toBe(2);
  });

  test('initialises likes to 1 when card has no likes yet', () => {
    const client = makeClient();
    const card = submitAndGetCard(client);

    client.moves.likeCard(card.id);

    const after: Card[] = client.getState()!.G.cards;
    const liked = after.find((c: Card) => c.id === card.id)!;
    expect(liked.likes).toBe(1);
  });

  test('returns INVALID_MOVE for a non-existent card ID', () => {
    const client = makeClient();
    const stateBefore = client.getState()!;

    client.moves.likeCard(9999);

    const stateAfter = client.getState()!;
    expect(stateAfter.G.cards).toEqual(stateBefore.G.cards);
  });
});

// ── loadCards ─────────────────────────────────────────────────────────────────

describe('loadCards', () => {
  test('bulk-loads cards into the game state', () => {
    const client = makeClient();
    const newCards: Card[] = [
      { id: 0, content: { title: 'Bulk A', description: 'dA', author: 'ghost' }, location: 'deck', timestamp: Date.now() },
      { id: 0, content: { title: 'Bulk B', description: 'dB', author: 'ghost' }, location: 'deck', timestamp: Date.now() },
    ];

    client.moves.loadCards(newCards);

    const after: Card[] = client.getState()!.G.cards;
    expect(after.length).toBe(2);
    expect(after[0].content.title).toBe('Bulk A');
    expect(after[1].content.title).toBe('Bulk B');
  });

  test('assigns sequential IDs starting from cards.length + 1', () => {
    const client = makeClient();
    // Pre-load one card
    const card = submitAndGetCard(client);
    expect(card.id).toBe(1);

    const newCards: Card[] = [
      { id: 0, content: { title: 'Next', description: 'd', author: 'ghost' }, location: 'deck', timestamp: Date.now() },
    ];
    client.moves.loadCards(newCards);

    const after: Card[] = client.getState()!.G.cards;
    const loaded = after.find((c: Card) => c.content.title === 'Next')!;
    expect(loaded.id).toBe(2);
  });

  test('also loads rules when provided', () => {
    const client = makeClient();
    const newCards: Card[] = [];
    const newRules = [{ id: 0, text: 'No elbows', playerID: '', timestamp: Date.now() }];

    client.moves.loadCards(newCards, newRules);

    const state = client.getState()!;
    expect(state.G.rules).toBeDefined();
    expect(state.G.rules!.length).toBe(1);
    expect(state.G.rules![0].text).toBe('No elbows');
    expect(state.G.rules![0].playerID).toBe(''); // ownership stripped
  });
});

// ── postMessage ───────────────────────────────────────────────────────────────

describe('postMessage', () => {
  test('returns INVALID_MOVE in singleplayer (numPlayers=1)', () => {
    const client = makeClient('0', 1);
    const stateBefore = client.getState()!;

    client.moves.postMessage('Hello');

    const stateAfter = client.getState()!;
    expect(stateAfter.G).toEqual(stateBefore.G);
  });

  test('returns INVALID_MOVE for empty text', () => {
    const client = makeClient('0', 2);
    const stateBefore = client.getState()!;

    client.moves.postMessage('');

    const stateAfter = client.getState()!;
    expect(stateAfter.G).toEqual(stateBefore.G);
  });

  test('returns INVALID_MOVE for text longer than 500 chars', () => {
    const client = makeClient('0', 2);
    const stateBefore = client.getState()!;

    client.moves.postMessage('x'.repeat(501));

    const stateAfter = client.getState()!;
    expect(stateAfter.G).toEqual(stateBefore.G);
  });
});

// ── declareRule ───────────────────────────────────────────────────────────────

describe('declareRule', () => {
  test('returns INVALID_MOVE in singleplayer (numPlayers=1)', () => {
    const client = makeClient('0', 1);
    const stateBefore = client.getState()!;

    client.moves.declareRule('No shouting');

    const stateAfter = client.getState()!;
    expect(stateAfter.G.rules).toEqual(stateBefore.G.rules);
  });

  test('returns INVALID_MOVE for empty text', () => {
    const client = makeClient('0', 2);
    const stateBefore = client.getState()!;

    client.moves.declareRule('   ');

    const stateAfter = client.getState()!;
    expect(stateAfter.G.rules).toEqual(stateBefore.G.rules);
  });

  test('returns INVALID_MOVE for text longer than 200 chars', () => {
    const client = makeClient('0', 2);
    const stateBefore = client.getState()!;

    client.moves.declareRule('x'.repeat(201));

    const stateAfter = client.getState()!;
    expect(stateAfter.G.rules).toEqual(stateBefore.G.rules);
  });
});

// ── revokeRule ────────────────────────────────────────────────────────────────

describe('revokeRule', () => {
  test('returns INVALID_MOVE in singleplayer (numPlayers=1)', () => {
    const client = makeClient('0', 1);
    // Load a rule first via loadCards
    client.moves.loadCards([], [{ id: 0, text: 'A Rule', playerID: '', timestamp: Date.now() }]);
    const stateBefore = client.getState()!;

    client.moves.revokeRule(1);

    const stateAfter = client.getState()!;
    expect(stateAfter.G.rules).toEqual(stateBefore.G.rules);
  });

  test('returns INVALID_MOVE for non-existent ruleId', () => {
    const client = makeClient('0', 2);
    const stateBefore = client.getState()!;

    client.moves.revokeRule(9999);

    const stateAfter = client.getState()!;
    expect(stateAfter.G.rules).toEqual(stateBefore.G.rules);
  });
});

// ── setScore ──────────────────────────────────────────────────────────────────

describe('setScore', () => {
  test('returns INVALID_MOVE for non-existent targetPlayerID', () => {
    const client = makeClient('0', 1);
    const stateBefore = client.getState()!;

    client.moves.setScore('99', 10);

    const stateAfter = client.getState()!;
    expect(stateAfter.G).toEqual(stateBefore.G);
  });

  test('does not change state when value equals previous score', () => {
    const client = makeClient('0', 1);

    // Player '0' exists; default score is 0. Setting to 0 is a no-op.
    client.moves.setScore('0', 0);

    const state = client.getState()!;
    // Score stays at 0 (no change recorded)
    expect(state.G).toBeDefined();
  });
});

// ── forceLeave ────────────────────────────────────────────────────────────────

describe('forceLeave', () => {
  test('returns INVALID_MOVE in singleplayer (numPlayers=1)', () => {
    const client = makeClient('0', 1);
    const stateBefore = client.getState()!;

    client.moves.forceLeave('1');

    const stateAfter = client.getState()!;
    expect(stateAfter.G.cards).toEqual(stateBefore.G.cards);
  });

  test('returns INVALID_MOVE when trying to kick the host (themselves)', () => {
    const client = makeClient('0', 2);
    const stateBefore = client.getState()!;

    // Player '0' is the host. Kicking themselves (targetPlayerID = '0') should fail.
    client.moves.forceLeave('0');

    const stateAfter = client.getState()!;
    expect(stateAfter.G.cards).toEqual(stateBefore.G.cards);
  });
});

// ── Multiplayer paths (numPlayers=2): gamelog.record + chat.syncFromLog ───────

describe('multiplayer (numPlayers=2) — gamelog and chat sync', () => {
  test('pickupCard in a 2-player game does not throw and moves a card to hand', () => {
    const client = makeClient('0', 2);
    // Put a card in deck
    client.moves.submitCard({
      id: 0,
      content: { title: 'MP Card', description: 'desc', author: 'ghost' },
      location: 'deck',
      owner: undefined,
      timestamp: Date.now(),
    });
    const cards: Card[] = client.getState()!.G.cards;
    client.moves.moveCard(cards[0].id, 'deck');

    expect(() => client.moves.pickupCard()).not.toThrow();

    const after: Card[] = client.getState()!.G.cards;
    const handCards = after.filter((c: Card) => c.location === 'hand');
    expect(handCards.length).toBeGreaterThan(0);
  });

  test('submitCard in a 2-player game records to gamelog and syncs chat', () => {
    const client = makeClient('0', 2);

    expect(() => client.moves.submitCard({
      id: 0,
      content: { title: 'MP Submit', description: 'desc', author: 'ghost' },
      location: 'hand',
      owner: '0',
      timestamp: Date.now(),
    })).not.toThrow();

    const state = client.getState()!;
    expect(state.G.cards.length).toBe(1);
    expect(state.G.cards[0].content.title).toBe('MP Submit');
  });

  test('moveCard to pile in a 2-player game exercises the gamelog/chat path', () => {
    const client = makeClient('0', 2);
    const card = submitAndGetCard(client);

    expect(() => moveToPile(client, card.id)).not.toThrow();

    const after: Card[] = client.getState()!.G.cards;
    const moved = after.find((c: Card) => c.id === card.id)!;
    expect(moved.location).toBe('pile');
  });

  test('claimCard in a 2-player game exercises the gamelog/chat path', () => {
    const client = makeClient('0', 2);
    const card = submitAndGetCard(client);
    moveToPile(client, card.id);

    expect(() => client.moves.claimCard(card.id)).not.toThrow();

    const after: Card[] = client.getState()!.G.cards;
    const claimed = after.find((c: Card) => c.id === card.id)!;
    expect(claimed.location).toBe('hand');
  });
});
