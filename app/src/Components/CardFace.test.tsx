import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardFace } from './CardFace';

function translateTextNodes(element: Element) {
  for (const node of [...element.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      const translated = document.createElement('font');
      translated.textContent = node.textContent;
      element.replaceChild(translated, node);
    }
  }
}

describe('CardFace with browser-translated credit', () => {
  it('updates when the next card has no author or date', () => {
    const first = { id: 1, location: 'pile', content: { title: 'First', description: 'First card', author: 'Author', date: '1700000000000' } };
    const { rerender } = render(<CardFace {...first} />);
    translateTextNodes(screen.getByText(/Author/));
    rerender(<CardFace id={2} location="pile" content={{ title: 'Second', description: 'Second card' }} />);
    expect(screen.getByText('Second card')).toBeTruthy();
    expect(screen.queryByText(/Author/)).toBeNull();
  });
});
