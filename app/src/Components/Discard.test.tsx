import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FocusContext, HotkeysContext, ImageCacheContext, LoadingContext } from '../lib/contexts';
import { Focus } from './Focus';
import { Header } from './CommonSpace';

vi.mock('../lib/clients', () => ({ likeGlobalCard: vi.fn() }));

const discardCard = (id: number, timestamp: number) => ({
  id,
  location: 'discard',
  timestamp,
  content: { title: `Discard ${id}`, description: 'Test card', author: 'Test' },
});

const headerProps = (cards: ReturnType<typeof discardCard>[]) => ({
  G: { cards },
  playerID: '1',
  matchID: 'TEST',
  isMultiplayer: true,
  matchData: [{ id: 1, name: 'Player 1', isConnected: true }],
  plugins: { player: { data: { players: { '1': { score: 0 } }, kickedPlayers: [] } } },
  moves: {},
  ctx: {},
  showPlayers: false,
  setShowPlayers: vi.fn(),
} as unknown as ComponentProps<typeof Header>);

function renderHeader(cards: ReturnType<typeof discardCard>[], hotkeys: { v?: boolean } = {}) {
  const setFocus = vi.fn();
  render(
    <FocusContext.Provider value={{ focus: {}, setFocus }}>
      <HotkeysContext.Provider value={{ hotkeys, setHotkeys: vi.fn() }}>
        <Header {...headerProps(cards)} />
      </HotkeysContext.Provider>
    </FocusContext.Provider>
  );
  return setFocus;
}

const focusProps = (cards: ReturnType<typeof discardCard>[], claimCard = vi.fn()) => ({
  G: { cards },
  playerID: '1',
  matchID: 'TEST',
  isMultiplayer: true,
  matchData: [],
  plugins: {},
  moves: { claimCard, moveCard: vi.fn(), likeCard: vi.fn() },
  ctx: {},
} as unknown as ComponentProps<typeof Focus>);

function focusedDiscardTree(
  cards: ReturnType<typeof discardCard>[],
  focus: { id?: number; zone?: 'discard' },
  hotkeys: { a?: boolean; d?: boolean } = {},
  setFocus = vi.fn(),
  setLoading = vi.fn(),
  claimCard = vi.fn(),
) {
  return (
    <FocusContext.Provider value={{ focus, setFocus }}>
      <HotkeysContext.Provider value={{ hotkeys, setHotkeys: vi.fn() }}>
        <ImageCacheContext.Provider value={{ imageCache: {}, dispatchImage: vi.fn() }}>
          <LoadingContext.Provider value={{ loading: false, setLoading }}>
            <Focus {...focusProps(cards, claimCard)} />
          </LoadingContext.Provider>
        </ImageCacheContext.Provider>
      </HotkeysContext.Provider>
    </FocusContext.Provider>
  );
}

describe('Discard focus entry and browsing', () => {
  it('opens the newest discard from the centered status bar button', () => {
    const setFocus = renderHeader([discardCard(1, 10), discardCard(2, 20)]);

    fireEvent.click(screen.getByRole('button', { name: 'View Discards' }));

    expect(setFocus).toHaveBeenCalledWith({ id: 2, zone: 'discard' });
  });

  it('opens the newest discard with V', () => {
    const setFocus = renderHeader([discardCard(1, 10), discardCard(2, 20)], { v: true });

    expect(setFocus).toHaveBeenCalledWith({ id: 2, zone: 'discard' });
  });

  it.each([
    { key: 'a' as const, focusedID: 2, expectedID: 1 },
    { key: 'd' as const, focusedID: 1, expectedID: 2 },
  ])('browses discard cards with $key', ({ key, focusedID, expectedID }) => {
    const cards = [discardCard(1, 10), discardCard(2, 20)];
    const setFocus = vi.fn();

    render(focusedDiscardTree(cards, { id: focusedID, zone: 'discard' }, { [key]: true }, setFocus));

    expect(setFocus).toHaveBeenCalledWith({ id: expectedID, zone: 'discard' });
  });
});

describe('Discard Yoink', () => {
  it('claims the focused discard and closes focus after the discard empties', () => {
    const card = discardCard(7, 70);
    const claimCard = vi.fn();
    const setFocus = vi.fn();
    const setLoading = vi.fn();
    const view = render(focusedDiscardTree([card], { id: card.id, zone: 'discard' }, {}, setFocus, setLoading, claimCard));

    fireEvent.click(screen.getByText('Yoink').closest('wired-card')!);
    expect(claimCard).toHaveBeenCalledWith(card.id, 'discard');

    view.rerender(focusedDiscardTree([], { id: card.id, zone: 'discard' }, {}, setFocus, setLoading, claimCard));

    expect(setFocus).toHaveBeenCalledWith({});
    expect(setLoading).toHaveBeenCalledWith(false);
  });
});
