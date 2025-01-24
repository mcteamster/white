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
        card.previousOwner = undefined;
        card.timestamp = Number(Date.now());
        card.location = "deck";
        return card;
      });
      discard.map(card => {
        card.owner = undefined;
        card.previousOwner = undefined;
        card.timestamp = Number(Date.now());
        card.location = "deck";
        return card;
      });
    } else {
      return INVALID_MOVE;
    }
  } else {
    // Pickup Card
    const card = deck[random?.Die(deck.length) - 1];
    card.owner = playerID;
    card.timestamp = Number(Date.now());
    card.location = "hand";
  }
}

const focusCard: Move<GameState> = ({ G, playerID }, id: number, focusState: boolean) => {
  // Only one card can be focused at any time
  G.cards.forEach(card => {
    if (card.id == id) {
      card.focused = focusState
    } else {
      card.focused = undefined
    }
  });
}

const moveCard: Move<GameState> = ({ G, playerID }, id, target, owner) => {
  let selectedCard = getCardById(getCardsByOwner(G.cards, playerID), id);
  if (selectedCard) {
    if (['pile', 'discard', 'deck'].includes(target)) {
      selectedCard.location = target;
      selectedCard.owner = undefined;
      selectedCard.previousOwner = playerID;
      selectedCard.timestamp = Number(Date.now());
    } else if (['hand', 'table'].includes(target)) {
      if (owner && owner != playerID) {
        selectedCard.owner = owner;
        selectedCard.previousOwner = playerID;
      }
      selectedCard.timestamp = Number(Date.now());
      selectedCard.location = target;
    } else {
      return INVALID_MOVE;
    }
  } else {
    return INVALID_MOVE;
  }
}

// Game
import { initialData } from './data/initialData';
export const BlankWhiteCards: Game<GameState> = {
  name: 'blank-white-cards',

  // @ts-ignore
  setup: () => (initialData),

  moves: {
    pickupCard,
    focusCard,
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