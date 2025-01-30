// Types
export interface Card {
  id: number,
  content: {
    title: string,
    description?: string,
    author?: string,
    date?: string,
    image?: string,
  },
  location: string, // 'deck' | 'pile' | 'discard' | 'hand' | 'table',
  focused: string[], // viewing players
  owner?: string, // playerID
  previousOwner?: string, // playerID, used for tracking ownership changes
  timestamp?: number, // epoch of last move
  likes?: number, // number of times this card has been liked
}

// Helper Functions
export const getCardById = (cards: Card[], id: number) => {
  return cards.find(card => card.id === id);
}

export const getCardByFocus = (cards: Card[], playerID: string | null) => {
  if (playerID) {
    return cards.find(card => card.focused.includes(playerID));
  } else {
    return;
  }
}

export const getCardsByLocation = (cards: Card[], position: string) => {
  return cards.filter(card => card.location === position);
}

export const getCardsByOwner = (cards: Card[], playerID: string) => {
  return cards.filter(card => card.owner === playerID);
}