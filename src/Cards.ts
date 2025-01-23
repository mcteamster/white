// Types
export interface Card {
  id: number,
  content: {
    title?: string,
    description?: string,
    author?: string,
    image?: string,
  },
  location: 'deck' | 'pile' | 'discard' | 'hand' | 'table',
  owner?: string,
}

// Helper Functions
export const getCardById = (cards: Card[], id: number) => {
  return cards.find(card => card.id === id);
}

export const getCardsByLocation = (cards: Card[], position: string) => {
  return cards.filter(card => card.location === position);
}

export const getCardsByOwner = (cards: Card[], playerID: string) => {
  return cards.filter(card => card.owner === playerID);
}