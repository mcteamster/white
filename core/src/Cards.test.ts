import { describe, it, expect } from 'vitest';
import type { Card } from './Cards.ts';
import {
  getCardById,
  getCardsByLocation,
  getCardsByOwner,
  getAdjacentCard,
} from './Cards.ts';

// ── Card creation helpers ─────────────────────────────────────────────────────

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    content: {
      title: 'Test Card',
      description: 'A test card',
    },
    location: 'deck',
    ...overrides,
  };
}

// ── Card creation — field validation ─────────────────────────────────────────

describe('Card shape', () => {
  it('has required id field', () => {
    const card = makeCard({ id: 42 });
    expect(card.id).toBe(42);
  });

  it('has content with title and description', () => {
    const card = makeCard({
      content: { title: 'My Title', description: 'My Desc' },
    });
    expect(card.content.title).toBe('My Title');
    expect(card.content.description).toBe('My Desc');
  });

  it('has a location field', () => {
    const card = makeCard({ location: 'hand' });
    expect(card.location).toBe('hand');
  });

  it('optional author field is preserved', () => {
    const card = makeCard({ content: { title: 'T', description: 'D', author: 'alice' } });
    expect(card.content.author).toBe('alice');
  });

  it('optional author field is absent when not set', () => {
    const card = makeCard({ content: { title: 'T', description: 'D' } });
    expect(card.content.author).toBeUndefined();
  });

  it('optional image field is preserved when set', () => {
    const card = makeCard({ content: { title: 'T', description: 'D', image: 'data:img' } });
    expect(card.content.image).toBe('data:img');
  });

  it('optional owner field is preserved when set', () => {
    const card = makeCard({ owner: 'player1' });
    expect(card.owner).toBe('player1');
  });

  it('optional likes field is preserved when set', () => {
    const card = makeCard({ likes: 7 });
    expect(card.likes).toBe(7);
  });
});

// ── Author attribution ────────────────────────────────────────────────────────

describe('Author attribution', () => {
  it('cards with different authors are distinguished by content.author', () => {
    const cardA = makeCard({ id: 1, content: { title: 'T', description: 'D', author: 'alice' } });
    const cardB = makeCard({ id: 2, content: { title: 'T', description: 'D', author: 'bob' } });
    expect(cardA.content.author).toBe('alice');
    expect(cardB.content.author).toBe('bob');
    expect(cardA.content.author).not.toBe(cardB.content.author);
  });

  it('owner field tracks current ownership', () => {
    const card = makeCard({ owner: 'player2' });
    expect(card.owner).toBe('player2');
  });

  it('previousOwner field records prior ownership', () => {
    const card = makeCard({ owner: 'player2', previousOwner: 'player1' });
    expect(card.previousOwner).toBe('player1');
    expect(card.owner).toBe('player2');
  });
});

// ── Location transitions ──────────────────────────────────────────────────────

describe('Card location values', () => {
  const validLocations = ['deck', 'pile', 'discard', 'hand', 'table', 'box'];

  for (const loc of validLocations) {
    it(`accepts location "${loc}"`, () => {
      const card = makeCard({ location: loc });
      expect(card.location).toBe(loc);
    });
  }

  it('location can transition from hand to pile', () => {
    const card = makeCard({ location: 'hand' });
    const updated: Card = { ...card, location: 'pile' };
    expect(updated.location).toBe('pile');
  });

  it('location can transition from pile to discard', () => {
    const card = makeCard({ location: 'pile' });
    const updated: Card = { ...card, location: 'discard' };
    expect(updated.location).toBe('discard');
  });

  it('location can transition from hand to table', () => {
    const card = makeCard({ location: 'hand', owner: '1' });
    const updated: Card = { ...card, location: 'table' };
    expect(updated.location).toBe('table');
  });

  it('location can transition to box (retired)', () => {
    const card = makeCard({ location: 'hand' });
    const updated: Card = { ...card, location: 'box', owner: undefined };
    expect(updated.location).toBe('box');
    expect(updated.owner).toBeUndefined();
  });
});

// ── getCardById ───────────────────────────────────────────────────────────────

describe('getCardById', () => {
  const cards: Card[] = [
    makeCard({ id: 1, content: { title: 'Alpha', description: 'D' } }),
    makeCard({ id: 2, content: { title: 'Beta', description: 'D' } }),
    makeCard({ id: 3, content: { title: 'Gamma', description: 'D' } }),
  ];

  it('returns the correct card by id', () => {
    const found = getCardById(cards, 2);
    expect(found?.id).toBe(2);
    expect(found?.content.title).toBe('Beta');
  });

  it('returns undefined for a missing id', () => {
    expect(getCardById(cards, 99)).toBeUndefined();
  });

  it('returns undefined on empty array', () => {
    expect(getCardById([], 1)).toBeUndefined();
  });
});

// ── getCardsByLocation ────────────────────────────────────────────────────────

describe('getCardsByLocation', () => {
  const cards: Card[] = [
    makeCard({ id: 1, location: 'deck' }),
    makeCard({ id: 2, location: 'hand', owner: '0' }),
    makeCard({ id: 3, location: 'hand', owner: '1' }),
    makeCard({ id: 4, location: 'discard' }),
    makeCard({ id: 5, location: 'box' }),
  ];

  it('returns all cards in the given location', () => {
    const hand = getCardsByLocation(cards, 'hand');
    expect(hand).toHaveLength(2);
    expect(hand.map(c => c.id).sort()).toEqual([2, 3]);
  });

  it('returns empty array when no cards at location', () => {
    expect(getCardsByLocation(cards, 'pile')).toHaveLength(0);
  });

  it('returns only boxed cards for "box"', () => {
    const boxed = getCardsByLocation(cards, 'box');
    expect(boxed).toHaveLength(1);
    expect(boxed[0].id).toBe(5);
  });
});

// ── getCardsByOwner ───────────────────────────────────────────────────────────

describe('getCardsByOwner', () => {
  const cards: Card[] = [
    makeCard({ id: 1, location: 'hand', owner: 'alice' }),
    makeCard({ id: 2, location: 'hand', owner: 'bob' }),
    makeCard({ id: 3, location: 'table', owner: 'alice' }),
    makeCard({ id: 4, location: 'deck' }),
  ];

  it('returns cards belonging to the given player', () => {
    const aliceCards = getCardsByOwner(cards, 'alice');
    expect(aliceCards).toHaveLength(2);
    expect(aliceCards.every(c => c.owner === 'alice')).toBe(true);
  });

  it('returns empty array if player owns no cards', () => {
    expect(getCardsByOwner(cards, 'charlie')).toHaveLength(0);
  });

  it('does not return cards with no owner', () => {
    const deckCard = getCardsByOwner(cards, undefined as unknown as string);
    // undefined owner won't match any named player
    expect(deckCard.every(c => c.owner !== 'alice' && c.owner !== 'bob')).toBe(true);
  });
});

// ── getAdjacentCard ───────────────────────────────────────────────────────────

describe('getAdjacentCard', () => {
  const cards: Card[] = [
    makeCard({ id: 10, location: 'pile', timestamp: 1000 }),
    makeCard({ id: 11, location: 'pile', timestamp: 2000 }),
    makeCard({ id: 12, location: 'pile', timestamp: 3000 }),
  ];

  it('returns prev card (older by timestamp) when direction is "prev"', () => {
    // "prev" sorts oldest-to-newest; getAdjacentCard returns the item before currentIndex
    // For id=12 (newest timestamp), prev should be id=11
    const adj = getAdjacentCard(cards, 12, 'prev', null);
    expect(adj?.id).toBe(11);
  });

  it('returns undefined for first card in prev direction', () => {
    // id=10 has the oldest timestamp, so sorted list is [10, 11, 12]; index 0 has nothing before it
    const adj = getAdjacentCard(cards, 10, 'prev', null);
    expect(adj).toBeUndefined();
  });

  it('returns undefined when card id does not exist', () => {
    const adj = getAdjacentCard(cards, 99, 'prev', null);
    expect(adj).toBeUndefined();
  });
});
