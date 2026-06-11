import type { Game, Move } from "boardgame.io";
import { INVALID_MOVE, Stage } from 'boardgame.io/core';
import { PluginPlayer } from 'boardgame.io/plugins';
import { Card, getCardById, getCardsByLocation } from './Cards';
import { presetDecks } from "./lib/constants";
import { PluginChat } from "./lib/plugin-chat";

// Game State
export interface GameState {
  cards: Card[],
}

// Moves
const pickupCard: Move<GameState> = ({ G, ctx, random, playerID, chat }: any) => {
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
    if (ctx.numPlayers > 1) chat.send({ type: 'event', playerID, text: `picked up a card` });
  }
}

const moveCard: Move<GameState> = ({ G, ctx, playerID, chat }: any, id, target, owner) => {
  const selectedCard = getCardById(G.cards, id);
  if (selectedCard) {
    const sourceLocation = selectedCard.location;
    const sourceOwner = selectedCard.owner;
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
    if (ctx.numPlayers > 1) {
      const publicLocations = ['pile', 'table'];
      const sourcePublic = publicLocations.includes(sourceLocation);
      const destPublic = publicLocations.includes(target);
      const showTitle = sourcePublic || destPublic;
      const title = showTitle ? `"${selectedCard.content.title.slice(0, 30)}"` : '';
      const recipientID = owner && owner !== playerID ? owner : undefined;

      let text: string;
      if (recipientID && target === 'hand') {
        text = title ? `sent to {recipient}: ${title}` : `sent a card to {recipient}`;
      } else if (recipientID) {
        text = title ? `→ {recipient}'s ${target}: ${title}` : `→ {recipient}'s ${target}`;
      } else if (target === 'pile') {
        // playing to pile — omit destination
        text = title ? `→ ${title}` : `→ pile`;
      } else {
        text = title ? `→ ${target}: ${title}` : `→ ${target}`;
      }

      chat.send({ type: 'event', playerID, targetPlayerID: recipientID, text });
    }
  } else {
    return INVALID_MOVE;
  }
}

const claimCard: Move<GameState> = ({ G, ctx, playerID, chat }: any, id) => {
  const selectedCard = getCardById(G.cards, id);
  if (selectedCard) {
    if (selectedCard.location == 'pile') {
      // Cards in the pile have no owner and can be "claimed" by anyone into their hand
      selectedCard.owner = playerID;
      selectedCard.timestamp = Number(Date.now());
      selectedCard.location = 'hand';
      if (ctx.numPlayers > 1) chat.send({ type: 'event', playerID, text: `← "${selectedCard.content.title.slice(0, 30)}"` });
    } else {
      return INVALID_MOVE;
    }
  } else {
    return INVALID_MOVE;
  }
}

const likeCard: Move<GameState> = ({ G }, id) => {
  const selectedCard = getCardById(G.cards, id);
  if (selectedCard?.likes) {
    selectedCard.likes++;
  } else if (selectedCard) {
    selectedCard.likes = 1
  } else {
    return INVALID_MOVE
  }
}

const submitCard: Move<GameState> = ({ G, ctx, chat }: any, card: Card, playerName?: string) => {
  card.id = G.cards.length + 1; // Commit ID sequentially to GameState
  G.cards.push(card);
  if (ctx.numPlayers > 1) chat.send({ type: 'event', text: `${playerName || 'Someone'} made a card` });
}

const loadCards: Move<GameState> = ({ G, ctx, playerID, chat }: any, cards: Card[]) => {
  if(playerID !== '0') return INVALID_MOVE; // Only the host can bulk load cards

  // Bulk load batches of cards
  const loadBuffer: Card[] = [];
  const startingID = G.cards.length + 1;
  cards.forEach((card: Card, i: number) => {
    card.id = startingID + i;
    loadBuffer.push(card);
  })
  G.cards.push(...loadBuffer);
  if (ctx.numPlayers > 1) {
    const deckSize = G.cards.filter((c: Card) => c.location === 'deck').length;
    chat.send({ type: 'event', text: `${cards.length} ${cards.length === 1 ? 'card' : 'cards'} loaded — ${deckSize} in deck` });
  }
}

const shuffleCards: Move<GameState> = ({ G, ctx, playerID, chat }: any) => {
  if(playerID !== '0') return INVALID_MOVE; // Only the host can reset the game

  // Return all cards to the deck, except those in the box
  G.cards.forEach((card: Card) => { 
    if (card.location !== 'box') {
      card.location = 'deck'; 
      card.timestamp = undefined;
    }
  });
  if (ctx.numPlayers > 1) {
    const deckSize = G.cards.filter((c: Card) => c.location !== 'box').length;
    chat.send({ type: 'event', playerID, text: `shuffled — ${deckSize} in deck` });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const postMessage: Move<GameState> = ({ ctx, playerID, chat }: any, text: string, playerName?: string) => {
  if (ctx.numPlayers <= 1) return INVALID_MOVE;
  if (!text || text.length > 500) return INVALID_MOVE;
  chat.send({ type: 'chat', playerID, playerName, text: text.trim() });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setScore: Move<GameState> = ({ ctx, player, chat }: any, targetPlayerID: string, value: number, setterName?: string, targetName?: string) => {
  if (player?.state && targetPlayerID in player.state) {
    const prev = player.state[targetPlayerID]?.score ?? 0;
    player.state[targetPlayerID] = { score: value };
    if (ctx.numPlayers > 1) {
      const delta = value - prev;
      const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
      const who = targetName || `Player ${targetPlayerID}`;
      const by = setterName && setterName !== targetName ? ` (by ${setterName})` : '';
      chat.send({ type: 'event', text: `${deltaStr} pts for ${who}${by}` });
    }
  } else {
    return INVALID_MOVE;
  }
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
      ignoreStaleStateID: true,
    },
    claimCard: {
      move: claimCard,
      client: false,
      ignoreStaleStateID: true,
    },
    pickupCard: {
      move: pickupCard,
      client: false,
      ignoreStaleStateID: true,
    },
    likeCard: {
      move: likeCard,
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
    setScore: {
      move: setScore,
      client: false,
      ignoreStaleStateID: true,
    },
    postMessage: {
      move: postMessage,
      client: false,
      ignoreStaleStateID: true,
    },
  },

  plugins: [
    PluginPlayer({ setup: () => ({ score: 0 as number }) }),
    PluginChat(),
  ],

  turn: {
    activePlayers: { all: Stage.NULL },
  },

  events: {
    endGame: false,
    endStage: false,
    endTurn: false,
  },
};