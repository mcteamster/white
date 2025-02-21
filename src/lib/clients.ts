// Clients
import { LobbyClient } from 'boardgame.io/client';
import { Game } from 'boardgame.io';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { BlankWhiteCards, GameState } from '../Game';
import { BlankWhiteCardsBoard } from '../Board';

// Lobby
export const lobbyClient = new LobbyClient({ server: (import.meta.env.VITE_LOBBY_SERVER) });

// Global Deck Singleplayer
export let startingDeck: GameState;
let SetupGame: Game = BlankWhiteCards;
try {
  startingDeck = await (await fetch('/decks/global.json')).json();
  if (startingDeck.cards && startingDeck.cards.length > 0) {
    SetupGame = { ...BlankWhiteCards, setup: () => (startingDeck) }
  }
} catch (e) {
  console.error(e)
}

export const GlobalBlankWhiteCardsClient = Client({
  game: SetupGame,
  board: BlankWhiteCardsBoard,
  debug: false,
});

// Multiplayer Custom Rooms
const serverUrl = import.meta.env.VITE_GAME_SERVER;
export const MultiplayerBlankWhiteCardsClient = Client({
  game: BlankWhiteCards,
  board: BlankWhiteCardsBoard,
  debug: false,
  multiplayer: SocketIO({ server: serverUrl }),
});

export const parsePathCode = () => {
  const pathname = window.location.pathname;
  if (pathname.match(/^\/[BCDFGHJKLMNPQRSTVWXZ]{4}$/i)) {
    const room = pathname.slice(1,5).toUpperCase();
    return room
  } else {
    return
  }
}