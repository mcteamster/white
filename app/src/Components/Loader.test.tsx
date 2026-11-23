import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
type TestCard = { id: number; location: string; content: { title: string; description: string } };

const card = (id: number, title: string): TestCard => ({
  id,
  location: 'box',
  content: { title, description: 'Test card' },
});

const loaderProps = (cards: TestCard[], playerID = '0', moveCard = vi.fn()): LoaderTestProps => ({
  G: { cards },
  playerID,
  isMultiplayer: true,
  mode: 'menu-tools-loader',
  moves: { moveCard, loadCards: vi.fn() },
  plugins: { player: { data: { connectedPlayers: ['0'], kickedPlayers: [] } } },
  setMode: vi.fn(),
} as unknown as LoaderTestProps);

afterEach(() => vi.clearAllMocks());

describe('Deck Loader hidden-card restoration', () => {
  it('shows a secondary restore action after the primary import and editor choices', async () => {
    render(<Loader {...loaderProps([card(1, 'Hidden card')])} />);

    const loadChoice = await screen.findByText('Load cards into this session');
    const editorChoice = screen.getByText('Open Deck Editor');
    const restoreAction = screen.getByRole('button', { name: 'Restore Hidden Cards' });

    expect(loadChoice.compareDocumentPosition(editorChoice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(editorChoice.compareDocumentPosition(restoreAction) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((restoreAction as HTMLButtonElement).style.textDecoration).toBe('underline');
    expect(restoreAction.textContent).toBe('Restore Hidden Cards');
  });

  it('does not expose restoration to non-hosts or when the box is empty', async () => {
    const { rerender } = render(<Loader {...loaderProps([card(1, 'Hidden card')], '1')} />);
    await screen.findByText('Open Deck Editor');
    expect(screen.queryByRole('button', { name: 'Restore Hidden Cards' })).toBeNull();

    rerender(<Loader {...loaderProps([], '0')} />);
    expect(screen.queryByRole('button', { name: 'Restore Hidden Cards' })).toBeNull();
  });

  it('restores to deck, stays open for more cards, and shows the empty state', async () => {
    const moveCard = vi.fn();
    const initialProps = loaderProps([card(1, 'First hidden'), card(2, 'Second hidden')], '0', moveCard);
    const { rerender } = render(<Loader {...initialProps} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Restore Hidden Cards' }));
    const restoreHeading = screen.getByText('Restore Hidden Cards');
    expect(restoreHeading.closest('wired-dialog')?.hasAttribute('open')).toBe(true);
    expect(screen.getByText('First hidden')).toBeTruthy();
    expect(screen.getByText('Second hidden')).toBeTruthy();
    expect(screen.getByText('First hidden').closest('wired-dialog')).toBeTruthy();
    expect(screen.getByText('Restore Hidden Cards').textContent).toBe('Restore Hidden Cards');
    expect(screen.queryByText(/Retired Cards|boxed cards/i)).toBeNull();
    expect((screen.getByText('First hidden').closest('wired-card')?.parentElement as HTMLElement).style.overflowY).toBe('auto');

    fireEvent.click(screen.getAllByText('Yoink')[0].closest('wired-card')!);
    expect(moveCard).toHaveBeenCalledWith(1, 'deck');
    expect(moveCard).not.toHaveBeenCalledWith(1, 'hand');
    expect(screen.getByText('Restore Hidden Cards')).toBeTruthy();

    rerender(<Loader {...initialProps} G={{ cards: [card(2, 'Second hidden')] }} />);
    await waitFor(() => expect(screen.queryByText('First hidden')).toBeNull());
    expect(screen.getByText('Second hidden')).toBeTruthy();

    fireEvent.click(screen.getByText('Back').closest('wired-card')!);
    expect(await screen.findByText('Deck Loader')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Restore Hidden Cards' }));
    expect(screen.getByText('Second hidden')).toBeTruthy();

    fireEvent.click(screen.getByText('Yoink').closest('wired-card')!);
    expect(moveCard).toHaveBeenCalledWith(2, 'deck');
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
