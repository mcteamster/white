import type { Game, Move } from "@mcteamster/white-engine";
import { INVALID_MOVE, Stage } from '@mcteamster/white-engine/core';
import { PluginPlayer } from '@mcteamster/white-engine/plugins';
import { Card, getCardById, getCardsByLocation } from './Cards';
import type { Rule } from './Cards';
import { presetDecks } from "./lib/constants";
import { PluginChat } from "./lib/plugin-chat";
import { PluginGameLog } from "./lib/plugin-gamelog";

// Game State
export interface GameState {
  cards: Card[],
  rules?: Rule[],
  hostPlayerID?: string,
  kickedPlayers?: string[],
}

// Moves
const pickupCard: Move<GameState> = ({ G, ctx, random, playerID, gamelog, chat }: any) => {
  if (G.kickedPlayers?.includes(playerID)) return INVALID_MOVE;
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
    if (ctx.numPlayers > 1) {
      gamelog.record({ move: 'pickupCard', playerID });
      chat.syncFromLog(gamelog.entries());
    }
  }
}

const moveCard: Move<GameState> = ({ G, ctx, playerID, gamelog, chat }: any, id, target, owner) => {
  if (G.kickedPlayers?.includes(playerID)) return INVALID_MOVE;
  const selectedCard = getCardById(G.cards, id);
  if (selectedCard) {
    const sourceLocation = selectedCard.location;
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
      const showTitle = publicLocations.includes(sourceLocation) || publicLocations.includes(target);
      const cardTitle = showTitle ? selectedCard.content.title.slice(0, 30) : undefined;
      const recipientID = owner && owner !== playerID ? owner : undefined;
      gamelog.record({ move: 'moveCard', playerID, cardID: selectedCard.id, cardTitle, target, targetPlayerID: recipientID });
      chat.syncFromLog(gamelog.entries());
    }
  } else {
    return INVALID_MOVE;
  }
}

const claimCard: Move<GameState> = ({ G, ctx, playerID, gamelog, chat }: any, id) => {
  if (G.kickedPlayers?.includes(playerID)) return INVALID_MOVE;
  const selectedCard = getCardById(G.cards, id);
  if (selectedCard) {
    if (selectedCard.location == 'pile') {
      // Cards in the pile have no owner and can be "claimed" by anyone into their hand
      selectedCard.owner = playerID;
      selectedCard.timestamp = Number(Date.now());
      selectedCard.location = 'hand';
      if (ctx.numPlayers > 1) {
        gamelog.record({ move: 'claimCard', playerID, cardID: selectedCard.id, cardTitle: selectedCard.content.title.slice(0, 30) });
        chat.syncFromLog(gamelog.entries());
      }
    } else {
      return INVALID_MOVE;
    }
  } else {
    return INVALID_MOVE;
  }
}

const likeCard: Move<GameState> = ({ G, playerID }: any, id) => {
  if (G.kickedPlayers?.includes(playerID)) return INVALID_MOVE;
  const selectedCard = getCardById(G.cards, id);
  if (selectedCard?.likes) {
    selectedCard.likes++;
  } else if (selectedCard) {
    selectedCard.likes = 1
  } else {
    return INVALID_MOVE
  }
}

const submitCard: Move<GameState> = ({ G, ctx, playerID, gamelog, chat }: any, card: Card, playerName?: string) => {
  if (G.kickedPlayers?.includes(playerID)) return INVALID_MOVE;
  card.id = G.cards.length + 1; // Commit ID sequentially to GameState
  G.cards.push(card);
  if (ctx.numPlayers > 1) {
    gamelog.record({ move: 'submitCard', playerID, playerName, cardID: card.id, cardTitle: card.content.title.slice(0, 30) });
    chat.syncFromLog(gamelog.entries());
  }
}

const loadCards: Move<GameState> = ({ G, ctx, playerID, gamelog, chat }: any, cards: Card[]) => {
  if (G.kickedPlayers?.includes(playerID)) return INVALID_MOVE;
  if(playerID !== (G.hostPlayerID ?? '0')) return INVALID_MOVE; // Only the host can bulk load cards

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
    gamelog.record({ move: 'loadCards', playerID, count: cards.length, delta: deckSize });
    chat.syncFromLog(gamelog.entries());
  }
}

const shuffleCards: Move<GameState> = ({ G, ctx, playerID, gamelog, chat }: any) => {
  if (G.kickedPlayers?.includes(playerID)) return INVALID_MOVE;
  if(playerID !== (G.hostPlayerID ?? '0')) return INVALID_MOVE; // Only the host can reset the game

  // Return all cards to the deck, except those in the box
  G.cards.forEach((card: Card) => { 
    if (card.location !== 'box') {
      card.location = 'deck'; 
      card.timestamp = undefined;
    }
  });
  if (ctx.numPlayers > 1) {
    const deckSize = G.cards.filter((c: Card) => c.location !== 'box').length;
    gamelog.record({ move: 'shuffleCards', playerID, count: deckSize });
    chat.syncFromLog(gamelog.entries());
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const postMessage: Move<GameState> = ({ G, ctx, playerID, gamelog, chat }: any, text: string, playerName?: string) => {
  if (G.kickedPlayers?.includes(playerID)) return INVALID_MOVE;
  if (ctx.numPlayers <= 1) return INVALID_MOVE;
  if (!text || text.length > 500) return INVALID_MOVE;
  gamelog.record({ move: 'postMessage', playerID, playerName, text: text.trim() });
  chat.syncFromLog(gamelog.entries());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const declareRule: Move<GameState> = ({ G, ctx, playerID, gamelog, chat }: any, text: string, playerName?: string) => {
  if (G.kickedPlayers?.includes(playerID)) return INVALID_MOVE;
  if (ctx.numPlayers <= 1) return INVALID_MOVE;
  if (!text || text.trim().length === 0 || text.length > 200) return INVALID_MOVE;

  const rules = G.rules ?? [];
  const maxId = rules.length > 0 ? Math.max(...rules.map((r: Rule) => r.id)) : 0;
  const rule: Rule = {
    id: maxId + 1,
    text: text.trim(),
    playerID,
    playerName,
    timestamp: Date.now(),
  };
  G.rules = [...rules, rule];

  gamelog.record({ move: 'postRule', playerID, playerName, ruleId: rule.id, ruleText: rule.text });
  chat.syncFromLog(gamelog.entries());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const revokeRule: Move<GameState> = ({ G, ctx, playerID, gamelog, chat }: any, ruleId: number, playerName?: string) => {
  if (G.kickedPlayers?.includes(playerID)) return INVALID_MOVE;
  if (ctx.numPlayers <= 1) return INVALID_MOVE;

  const rules = G.rules ?? [];
  const ruleIndex = rules.findIndex((r: Rule) => r.id === ruleId);
  if (ruleIndex === -1) return INVALID_MOVE;

  const rule = rules[ruleIndex];
  if (playerID !== rule.playerID && playerID !== (G.hostPlayerID ?? '0')) return INVALID_MOVE;

  G.rules = rules.filter((r: Rule) => r.id !== ruleId);

  gamelog.record({ move: 'revokeRule', playerID, playerName, ruleId: rule.id, ruleText: rule.text });
  chat.syncFromLog(gamelog.entries());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setScore: Move<GameState> = ({ G, ctx, playerID, player, gamelog, chat }: any, targetPlayerID: string, value: number, setterName?: string, targetName?: string) => {
  if (G.kickedPlayers?.includes(playerID)) return INVALID_MOVE;
  if (player?.state && targetPlayerID in player.state) {
    const prev = player.state[targetPlayerID]?.score ?? 0;
    player.state[targetPlayerID] = { score: value };
    if (ctx.numPlayers > 1) {
      const delta = value - prev;
      gamelog.record({ move: 'setScore', playerID: targetPlayerID, targetPlayerID, targetPlayerName: targetName, setterName, delta });
      chat.syncFromLog(gamelog.entries());
    }
  } else {
    return INVALID_MOVE;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transferHost: Move<GameState> = ({ G, playerID, gamelog, chat }: any, targetHostID: string) => {
  if (G.kickedPlayers?.includes(playerID)) return INVALID_MOVE;
  if (targetHostID === (G.hostPlayerID ?? '0')) return INVALID_MOVE; // Already host
  if (G.kickedPlayers?.includes(targetHostID)) return INVALID_MOVE; // Can't transfer to kicked

  G.hostPlayerID = targetHostID;
  gamelog.record({ move: 'transferHost', playerID, newHostID: targetHostID });
  chat.syncFromLog(gamelog.entries());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const forceLeave: Move<GameState> = ({ G, ctx, playerID, gamelog, chat }: any, targetPlayerID: string, playerName?: string) => {
  if (G.kickedPlayers?.includes(playerID)) return INVALID_MOVE;
  if (playerID !== (G.hostPlayerID ?? '0')) return INVALID_MOVE; // Only host can kick
  if (targetPlayerID === (G.hostPlayerID ?? '0')) return INVALID_MOVE; // Can't kick yourself
  if (ctx.numPlayers <= 1) return INVALID_MOVE;

  // Initialize kick list if needed
  if (!G.kickedPlayers) G.kickedPlayers = [];
  if (G.kickedPlayers.includes(targetPlayerID)) return INVALID_MOVE; // Already kicked

  // Return target's hand and table cards to deck
  G.cards.filter((c: Card) => c.owner === targetPlayerID).forEach((card: Card) => {
    card.location = 'deck';
    card.previousOwner = targetPlayerID;
    card.owner = undefined;
    card.timestamp = Number(Date.now());
  });

  // Mark as kicked
  G.kickedPlayers.push(targetPlayerID);

  gamelog.record({ move: 'forceLeave', playerID, targetPlayerID, playerName });
  chat.syncFromLog(gamelog.entries());
}

// Game
export const BlankWhiteCards: Game<GameState> = {
  name: 'blank-white-cards',

  setup: (_, setupData) => {
    const preset = (setupData?.presetDeck || 'blank') as string;
    if (preset == 'blank') {
      return { cards: [], rules: [], hostPlayerID: '0' }; // Blank White Deck
    } else {
      try {
        const deck = presetDecks[preset] // Look for a matching preset deck
        if (deck) {
          return { ...deck, rules: deck.rules ?? [], hostPlayerID: '0' };
        }
      } catch (e) {
        console.error(e);
      }
      return { cards: [], rules: [], hostPlayerID: '0' }; // Blank White Deck as fallback
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
    declareRule: {
      move: declareRule,
      client: false,
      ignoreStaleStateID: true,
    },
    revokeRule: {
      move: revokeRule,
      client: false,
      ignoreStaleStateID: true,
    },
    transferHost: {
      move: transferHost,
      client: false,
      ignoreStaleStateID: true,
    },
    forceLeave: {
      move: forceLeave,
      client: false,
      ignoreStaleStateID: true,
    },
  },

  plugins: [
    PluginPlayer({ setup: () => ({ score: 0 as number }) }),
    PluginGameLog(),
    PluginChat(),
  ],

  turn: {
    activePlayers: { all: Stage.NULL as unknown as string },
  },

  events: {
    endGame: false,
    endStage: false,
    endTurn: false,
  },
};