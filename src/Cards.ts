// Types
export interface Card {
  id: number,
  content: {
    title: string,
    description: string,
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

export const getAdjacentCard = (cards: Card[], id: number, direction: 'prev' | 'next') => {
  const position = cards.find((card) => card.id == id)?.location;
  const owner = cards.find((card) => card.id == id)?.owner;
  if (position) {
    const directionSort = {
      prev: (a: Card, b: Card) => (a.timestamp || 0) - (b.timestamp || 0), // Oldest to Newest
      next: (a: Card, b: Card) => (b.timestamp || 0) - (a.timestamp || 0), // Newest to Oldest
    }
    let cardList = cards.filter(card => card.location === position).sort(directionSort[direction])
    if (position == 'hand' || position == 'table') {
      cardList = cardList.filter(card => card?.owner === owner); // Filter for same ownership
    }
    const currentIndex = cardList.findIndex((card) => card.id == id);
    if (currentIndex > 0) {
      return cardList[currentIndex - 1];
    }
  }
}