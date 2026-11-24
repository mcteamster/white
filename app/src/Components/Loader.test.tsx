import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { externalLink } from '../lib/hooks';
import { Loader } from './Loader';

vi.mock('../lib/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/hooks')>();
  return {
    ...actual,
    externalLink: vi.fn(),
    useWindowDimensions: () => ({ width: 800, height: 600, upright: false }),
  };
});

vi.mock('../lib/clients', () => ({ submitGlobalCard: vi.fn() }));

type LoaderTestProps = ComponentProps<typeof Loader>;
type TestCard = { id: number; location: string; content: { title: string; description: string; image?: string } };

const card = (id: number, title: string): TestCard => ({
  id,
  location: 'box',
  content: { title, description: 'Test card' },
});

const loaderProps = (cards: TestCard[], playerID = '0', moveCard = vi.fn(), shuffleCards = vi.fn()): LoaderTestProps => ({
  G: { cards },
  playerID,
  isMultiplayer: true,
  mode: 'menu-tools-loader',
  moves: { moveCard, shuffleCards, loadCards: vi.fn() },
  plugins: { player: { data: { connectedPlayers: ['0'], kickedPlayers: [] } } },
  setMode: vi.fn(),
} as unknown as LoaderTestProps);

beforeEach(() => vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('Deck Loader hidden-card restoration', () => {
  it('places restore between session loading and the external Deck Editor', async () => {
    render(<Loader {...loaderProps([card(1, 'Hidden card')])} />);

    const loadChoice = await screen.findByText('Load cards into this session');
    const editorChoice = screen.getByText('Open Deck Editor');
    const restoreAction = screen.getByRole('button', { name: 'Restore Hidden Cards' });
    const loadChoiceCard = loadChoice.closest('wired-card') as HTMLElement;

    expect(loadChoice.compareDocumentPosition(restoreAction) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(restoreAction.compareDocumentPosition(editorChoice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(restoreAction.tagName).toBe('WIRED-CARD');
    expect(restoreAction.style.width).toBe(loadChoiceCard.style.width);
    expect(restoreAction.style.margin).toBe(loadChoiceCard.style.margin);
    expect(restoreAction.style.textAlign).toBe(loadChoiceCard.style.textAlign);
    expect(restoreAction.style.backgroundColor).toBe(loadChoiceCard.style.backgroundColor);
    expect(restoreAction.textContent).toContain('Restore Hidden Cards');
  });

  it('does not expose restoration to non-hosts or when the box is empty', async () => {
    const { rerender } = render(<Loader {...loaderProps([card(1, 'Hidden card')], '1')} />);
    await screen.findByText('Open Deck Editor');
    expect(screen.queryByRole('button', { name: 'Restore Hidden Cards' })).toBeNull();

    rerender(<Loader {...loaderProps([], '0')} />);
    expect(screen.queryByRole('button', { name: 'Restore Hidden Cards' })).toBeNull();
  });

  it('starts with IDs only and keeps title and image visibility independent of selection', async () => {
    const first = card(41, 'First hidden');
    first.content.image = 'data:image/png;base64,AA==';
    render(<Loader {...loaderProps([first, card(83, 'Second hidden')])} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Restore Hidden Cards' }));
    const firstRow = screen.getByRole('checkbox', { name: 'ID 41' });
    expect(firstRow.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('checkbox', { name: 'ID 83' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.queryByText('First hidden')).toBeNull();
    expect(screen.getByText('*'.repeat('First hidden'.length))).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText(/boxed cards|total/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'To Hand' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('button', { name: 'To Deck' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText(/appear as visible cards in later exports/)).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox', { name: 'ID 41' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hide Titles' }));
    expect(screen.getByText('First hidden')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'ID 41' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Hide Images' }));
    await waitFor(() => expect(screen.getByRole('img', { name: 'Card 41' }).getAttribute('src')).toBe(first.content.image));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hide Titles' }));
    expect(screen.queryByText('First hidden')).toBeNull();
    expect(screen.getByText('*'.repeat('First hidden'.length))).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Card 41' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'ID 41' }).getAttribute('aria-checked')).toBe('true');

    fireEvent.click(screen.getByText('Back').closest('wired-card')!);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore Hidden Cards' }));
    expect(screen.getByRole('checkbox', { name: 'ID 41' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('checkbox', { name: 'Hide Titles' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'Hide Images' }).getAttribute('aria-checked')).toBe('true');
  });

  it('sends only selected cards to the chosen destination and stays open as the box changes', async () => {
    const moveCard = vi.fn();
    const shuffleCards = vi.fn();
    const initialProps = loaderProps([
      card(41, 'First hidden'),
      card(83, 'Second hidden'),
      card(127, 'Unselected hidden'),
    ], '0', moveCard, shuffleCards);
    const { rerender } = render(<Loader {...initialProps} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Restore Hidden Cards' }));
    const restoreHeading = screen.getByText('Restore Hidden Cards');
    expect(restoreHeading.closest('wired-dialog')?.hasAttribute('open')).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'ID 41' }).parentElement as HTMLElement).style.overflowY).toBe('auto');

    fireEvent.click(screen.getByRole('checkbox', { name: 'ID 41' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'ID 83' }));
    fireEvent.click(screen.getByRole('button', { name: 'To Hand' }));
    expect(moveCard).toHaveBeenNthCalledWith(1, 41, 'hand');
    expect(moveCard).toHaveBeenNthCalledWith(2, 83, 'hand');
    expect(moveCard).not.toHaveBeenCalledWith(127, 'hand');
    expect(screen.getByRole('checkbox', { name: 'ID 41' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('Restore Hidden Cards').closest('wired-dialog')?.hasAttribute('open')).toBe(true);

    rerender(<Loader {...initialProps} G={{ cards: [card(127, 'Unselected hidden')] }} />);
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'ID 41' })).toBeNull());
    fireEvent.click(screen.getByRole('checkbox', { name: 'ID 127' }));
    fireEvent.click(screen.getByRole('button', { name: 'To Deck' }));
    expect(moveCard).toHaveBeenCalledWith(127, 'deck');
    expect(shuffleCards).not.toHaveBeenCalled();
    expect(screen.getByText('Restore Hidden Cards').closest('wired-dialog')?.hasAttribute('open')).toBe(true);

    rerender(<Loader {...initialProps} G={{ cards: [] }} />);
    await screen.findByText('No hidden cards to restore.');
    expect(screen.getByText('Restore Hidden Cards').closest('wired-dialog')?.hasAttribute('open')).toBe(true);
  });

  it('preserves the normal file preview and Deck Editor launch choices', async () => {
    render(<Loader {...loaderProps([])} />);

    const loadChoice = await screen.findByText('Load cards into this session');
    const fileInput = document.querySelector<HTMLInputElement>('#fileselector')!;
    const clickFileInput = vi.spyOn(fileInput, 'click');
    fireEvent.click(loadChoice.closest('wired-card')!);
    expect(clickFileInput).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByText('Open Deck Editor').closest('wired-card')!);
    expect(externalLink).toHaveBeenCalledWith('https://blankwhite.cards/editor');

    const deckFile = new File([JSON.stringify({ cards: [{ id: 3, content: { title: 'Imported card', description: 'Saved deck' } }] })], 'deck.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [deckFile] } });
    expect(await screen.findByText('Imported card', {}, { timeout: 2000 })).toBeTruthy();
    expect(screen.getByText('Tap cards to include/exclude')).toBeTruthy();
  });
});
