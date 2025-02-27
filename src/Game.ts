import type { Game, Move } from "boardgame.io";
import { INVALID_MOVE, Stage } from 'boardgame.io/core';
import { Card, getCardById, getCardsByLocation, getCardsByOwner } from './Cards';
import { presetDecks } from "./lib/constants";

// Game State
export interface GameState {
  cards: Card[],
}

// Moves
const pickupCard: Move<GameState> = ({ G, random, playerID }) => {
  const deck = getCardsByLocation(G.cards, "deck");
  if (deck.length === 0) {
    // Reshuffle Pile and Discard into Deck
    const pile = getCardsByLocation(G.cards, "pile");
    const discard = getCardsByLocation(G.cards, "discard");
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

const moveCard: Move<GameState> = ({ G, playerID }, id, target, owner) => {
  const selectedCard = getCardById(getCardsByOwner(G.cards, playerID), id);
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

const submitCard: Move<GameState> = ({ G }, card: Card) => {
  card.id = G.cards.length + 1; // Commit ID sequentially to GameState
  G.cards.push(card);
}

const loadCards: Move<GameState> = ({ G, playerID }, cards: Card[]) => {
  if(playerID !== '0') return INVALID_MOVE; // Only the host can bulk load cards

  // Bulk load batches of cards
  const loadBuffer: Card[] = [];
  const startingID = G.cards.length + 1;
  cards.forEach((card: Card, i: number) => {
    card.id = startingID + i;
    loadBuffer.push(card);
  })
  G.cards.push(...loadBuffer);
}

const shuffleCards: Move<GameState> = ({ G, playerID }) => {
  if(playerID !== '0') return INVALID_MOVE; // Only the host can reset the game

  // Return all cards to the deck
  G.cards.forEach(card => { card.location = 'deck'; card.timestamp = undefined});
}

// Game
export const BlankWhiteCards: Game<GameState> = {
  name: 'blank-white-cards',

  setup: (_, setupData) => {
    const preset = (setupData?.presetDeck || 'blank') as string;
    if (preset == 'blank') {
      return { cards: [] }; // Blank White Deck
    } else {
      try {
        const deck = presetDecks[preset] // Look for a matching preset deck
        if (deck) {
          return deck;
        }
      } catch (e) {
        console.error(e);
      }
      return { cards: [] }; // Blank White Deck as fallback
    }
  },

  moves: {
    moveCard: {
      move: moveCard,
      client: false,
      ignoreStaleStateID: true,
    },
    pickupCard: {
      move: pickupCard,
      client: false,
      ignoreStaleStateID: true,
    },
    submitCard: {
      move: submitCard,
      client: false,
      ignoreStaleStateID: true,
    },
    loadCards: {
      move: loadCards,
      client: false,
      ignoreStaleStateID: true,
    },
    shuffleCards: {
      move: shuffleCards,
      client: false,
      ignoreStaleStateID: true,
    },
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