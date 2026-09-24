import { describe, it, expect } from 'vitest';
import type { Card } from '@mcteamster/white-core';
import { sanitiseCard, generateDeckHTML, downloadDeck } from './data';

// ── sanitiseCard ──────────────────────────────────────────────────────────────

describe('sanitiseCard', () => {
  it('extracts title and description from v2 schema', () => {
    const input = {
      content: { title: 'My Title', description: 'My Desc', author: 'alice', date: 1000 },
      location: 'deck',
    };
    const result = sanitiseCard(input);
    expect(result.content.title).toBe('My Title');
    expect(result.content.description).toBe('My Desc');
    expect(result.content.author).toBe('alice');
  });

  it('falls back to top-level title/description for v1 schema', () => {
    const input = {
      title: 'V1 Title',
      description: 'V1 Desc',
      author: 'bob',
      location: 'deck',
    };
    const result = sanitiseCard(input);
    expect(result.content.title).toBe('V1 Title');
    expect(result.content.description).toBe('V1 Desc');
  });

  it('defaults location to "deck" for unknown locations', () => {
    const input = { content: { title: 'T', description: 'D' }, location: 'pile' };
    const result = sanitiseCard(input);
    expect(result.location).toBe('deck');
  });

  it('preserves location "box"', () => {
    const input = { content: { title: 'T', description: 'D' }, location: 'box' };
    const result = sanitiseCard(input);
    expect(result.location).toBe('box');
  });

  it('sets location to "box" when reports == 1', () => {
    const input = { content: { title: 'T', description: 'D' }, location: 'deck', reports: 1 };
    const result = sanitiseCard(input);
    expect(result.location).toBe('box');
  });

  it('preserves likes when positive and less than 1 billion', () => {
    const input = { content: { title: 'T', description: 'D' }, location: 'deck', likes: 42 };
    const result = sanitiseCard(input);
    expect(result.likes).toBe(42);
  });

  it('drops likes when zero', () => {
    const input = { content: { title: 'T', description: 'D' }, location: 'deck', likes: 0 };
    const result = sanitiseCard(input);
    expect(result.likes).toBeUndefined();
  });

  it('drops likes when negative', () => {
    const input = { content: { title: 'T', description: 'D' }, location: 'deck', likes: -5 };
    const result = sanitiseCard(input);
    expect(result.likes).toBeUndefined();
  });

  it('drops likes when >= 1 billion', () => {
    const input = { content: { title: 'T', description: 'D' }, location: 'deck', likes: 1_000_000_000 };
    const result = sanitiseCard(input);
    expect(result.likes).toBeUndefined();
  });

  it('preserves image from v2 schema', () => {
    const input = { content: { title: 'T', description: 'D', image: 'somedata' }, location: 'deck' };
    const result = sanitiseCard(input);
    expect(result.content.image).toBe('somedata');
  });

  it('preserves image from v1 schema (picture field)', () => {
    const input = { title: 'T', description: 'D', picture: 'oldformat', location: 'deck' };
    const result = sanitiseCard(input);
    expect(result.content.image).toBe('oldformat');
  });

  it('sets id to 0 (default)', () => {
    const input = { content: { title: 'T', description: 'D' }, location: 'deck' };
    const result = sanitiseCard(input);
    expect(result.id).toBe(0);
  });
});

// ── generateDeckHTML ──────────────────────────────────────────────────────────

describe('generateDeckHTML', () => {
  const sampleCards: Card[] = [
    { id: 1, content: { title: 'Alpha', description: 'First card', author: 'alice' }, location: 'deck' },
    { id: 2, content: { title: 'Beta', description: 'Second card', author: 'bob' }, location: 'deck' },
    { id: 3, content: { title: 'Hidden', description: 'Boxed card', author: 'charlie' }, location: 'box' },
  ];

  it('returns a string', () => {
    const html = generateDeckHTML(sampleCards);
    expect(typeof html).toBe('string');
  });

  it('contains DOCTYPE declaration', () => {
    const html = generateDeckHTML(sampleCards);
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('encodes all provided cards as base64 in the script block', () => {
    const html = generateDeckHTML(sampleCards);
    // The raw data is base64-encoded JSON — all three cards should be in it
    expect(html).toContain('const rawData =');
    // The HTML contains the encoded payload; confirm titles survive round-trip
    const match = html.match(/const rawData =\s*'([^']+)'/);
    expect(match).not.toBeNull();
    const decoded = decodeURI(atob(match![1]));
    expect(decoded).toContain('Alpha');
    expect(decoded).toContain('Beta');
    expect(decoded).toContain('Hidden'); // box cards are included in the data
  });

  it('includes blank white cards branding', () => {
    const html = generateDeckHTML(sampleCards);
    expect(html.toLowerCase()).toContain('blank white cards');
  });

  it('works with an empty card array', () => {
    const html = generateDeckHTML([]);
    expect(typeof html).toBe('string');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('includes rules in encoded payload when provided', () => {
    const rules = [{ id: 1, text: 'No swearing', playerID: '0', timestamp: 999 }];
    const html = generateDeckHTML(sampleCards, rules);
    const match = html.match(/const rawData =\s*'([^']+)'/);
    expect(match).not.toBeNull();
    const decoded = decodeURI(atob(match![1]));
    expect(decoded).toContain('No swearing');
  });
});

// ── downloadDeck (DOM interaction — verifies no throw in jsdom) ───────────────

describe('downloadDeck', () => {
  it('does not throw when called with valid cards', () => {
    const cards: Card[] = [
      { id: 1, content: { title: 'T', description: 'D', author: 'ghost' }, location: 'deck' },
    ];
    // jsdom supports createElement/appendChild but anchor click is a no-op
    expect(() => downloadDeck(cards)).not.toThrow();
  });
});
