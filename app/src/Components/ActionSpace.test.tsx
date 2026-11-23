import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Toolbar } from './ActionSpace';

vi.mock('../Canvas.js', () => ({
  undo: vi.fn(), redo: vi.fn(), strokes: [], sketchpad: {}, fillWhite: vi.fn(),
  cycleBrushSize: vi.fn(), getCurrentBrushSize: vi.fn(), getMode: vi.fn(),
  setMode: vi.fn(), MODE_DRAW: 'draw', MODE_ERASE: 'erase', MODE_DOTS: 'dots',
}));

const card = (id: number, location: string) => ({ id, location, content: { title: 'Card', description: 'Description' } });
const props = {
  playerID: '0', mode: 'play', setMode: vi.fn(), isMultiplayer: true,
  moves: {}, ctx: {}, plugins: {},
} as unknown as Parameters<typeof Toolbar>[0];

function translateTextNodes(element: Element) {
  for (const node of [...element.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      const translated = document.createElement('font');
      translated.textContent = node.textContent;
      element.replaceChild(translated, node);
    }
  }
}

describe('translated toolbar counts', () => {
  beforeEach(() => {
    document.body.insertAdjacentHTML('beforeend', '<div id="create"></div><div id="finalise"></div>');
  });

  it('updates the reset count when a translated pile changes', () => {
    const { rerender } = render(<MemoryRouter><Toolbar {...props} G={{ cards: [card(1, 'pile')] }} /></MemoryRouter>);
    const label = screen.getByText(/Reset Pile/);
    translateTextNodes(label);
    rerender(<MemoryRouter><Toolbar {...props} G={{ cards: [card(1, 'pile'), card(2, 'discard')] }} /></MemoryRouter>);
    expect(screen.getByText('Reset Pile (2)')).toBeTruthy();
  });

  it('lets the elected host open the Loader after player 0 is kicked', () => {
    const setMode = vi.fn();
    render(<MemoryRouter><Toolbar
      {...props}
      playerID="1"
      mode="menu-tools"
      setMode={setMode}
      plugins={{ player: { data: { connectedPlayers: ['0', '1'], kickedPlayers: ['0'] } } }}
      G={{ cards: [card(1, 'box')] }}
    /></MemoryRouter>);

    fireEvent.click(screen.getByText('Load').closest('wired-card')!);
    expect(setMode).toHaveBeenCalledWith('menu-tools-loader');
  });

  it('lays out Tools controls in rows of at most four and omits the Box control', () => {
    const { container } = render(<MemoryRouter><Toolbar
      {...props}
      mode="menu-tools"
      plugins={{ player: { data: { connectedPlayers: ['0'], kickedPlayers: [] } } }}
      G={{ cards: [card(1, 'box'), card(2, 'discard')] }}
    /></MemoryRouter>);

    const controls = container.querySelector('div[style*="grid-template-columns"]');
    expect(controls?.getAttribute('style')).toContain('grid-template-columns: repeat(4, 3.5em)');
    expect(controls?.children).toHaveLength(5);
    expect(screen.queryByText(/Box \(/)).toBeNull();
  });
});
