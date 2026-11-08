import { render, screen } from '@testing-library/react';
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
});
