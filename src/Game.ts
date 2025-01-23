import type { Game, Move } from "boardgame.io";
import { INVALID_MOVE, Stage } from 'boardgame.io/core';
import { Card, getCardById, getCardsByLocation, getCardsByOwner } from './Cards';

// Game State
export interface GameState {
  cards: Card[],
}

// Moves
const pickupCard: Move<GameState> = ({ G, random, playerID }) => {
  let deck = getCardsByLocation(G.cards, "deck");
  if (deck.length === 0) {
    // Reshuffle Pile and Discard into Deck
    let pile = getCardsByLocation(G.cards, "pile");
    let discard = getCardsByLocation(G.cards, "discard");
    if (pile.length > 0 || discard.length > 0) {
      pile.map(card => {
        card.owner = undefined;
        card.location = "deck";
        return card;
      });
      discard.map(card => {
        card.owner = undefined;
        card.location = "deck";
        return card;
      });
    } else {
      return INVALID_MOVE;
    }
  } else {
    // Pickup Card
    const card = deck[random?.Die(deck.length)-1];
    card.owner = playerID;
    card.location = "hand";
  }
}

const moveCard: Move<GameState> = ({ G, playerID }, id, target, owner) => {
  let selectedCard = getCardById(getCardsByOwner(G.cards, playerID), id);
  if (selectedCard) {
    if (['pile', 'discard', 'deck'].includes(target)) {
      selectedCard.location = target;
      selectedCard.owner = undefined;
    } else if (['hand', 'table'].includes(target)) {
      if (owner && owner != playerID) {
        selectedCard.owner = owner;
      }
      selectedCard.location = target;
    } else {
      return INVALID_MOVE;
    }
  } else {
    return INVALID_MOVE;
  }
}

// Game
export const BlankWhiteCards: Game<GameState> = {
  name: 'blank-white-cards',

  setup: () => ({
    cards: [
      {
        id: 1,
        content: {
          title: "Card 1",
          description: "This is card 1",
          author: "Author",
          image: "https://via.placeholder.com/150",
        },
        location: "deck",
      },
      {
        id: 2,
        content: {
          title: "Card 2",
          description: "This is card 2",
          author: "Author",
          image: "https://via.placeholder.com/150",
        },
        location: "deck",
      },
      {
        id: 3,
        content: {
          title: "Card 3",
          description: "This is card 3",
          author: "Author",
          image: "https://via.placeholder.com/150",
        },
        location: "deck",
      },
    ],
  }),

  moves: {
    pickupCard,
    moveCard,
  },

  turn: {
    activePlayers: { all: Stage.NULL },
  },

  events: {
    endGame: false,
    endStage: false,
    endTurn: false,
  },
};