// Clients
import { LobbyClient } from 'boardgame.io/client';
import { Game } from 'boardgame.io';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { BlankWhiteCards, GameState } from '../Game';
import { BlankWhiteCardsBoard } from '../Board';
import { Card } from '../Cards';
import { SERVERS } from './constants';

// Global Deck Singleplayer
export let startingDeck: GameState;
let SetupGame: Game = BlankWhiteCards;
try {
  startingDeck = await (await fetch(`${import.meta.env.VITE_ORIGIN}/decks/global.json`)).json();
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
export let lobbyClient = new LobbyClient({ server: import.meta.env.VITE_DEFAULT_LOBBY_SERVER });
export let MultiplayerBlankWhiteCardsClient = Client({
  game: BlankWhiteCards,
  board: BlankWhiteCardsBoard,
  debug: false,
  multiplayer: SocketIO({ server: import.meta.env.VITE_DEFAULT_GAME_SERVER }),
});

export const setClients = (room: string) => {
  if (import.meta.env.VITE_MULTI_REGION === 'true') {
    // This implementation is specific to a 2 or 3 global region server setup, adjust balancing accordingly
    let server;
    if (room.match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/)) {
      // Set server region based on room code
      if (room.match(/[BCDFGHJKLM]$/)) {
        server = SERVERS.AP
      } else if (room.match(/[FGHJKLM]$/)) { // Will be caught by AP until an EU server is available
        server = SERVERS.EU
      } else if (room.match(/[NPQRSTVWXZ]$/)) {
        server = SERVERS.NA
      }
    } else {
      // Set server region based on time of day (measuring latency accurately is actually kinda hard?)
      const hour = new Date().getUTCHours();
      if (hour >= 4 && hour < 16) { // Asia Pacific peak: 4-16 UTC (12pm-12am UTC+8)
        server = SERVERS.AP;
      } else if (hour >= 16 || hour < 4) { // North America peak: 16-4 UTC (12pm-12am UTC-4)
        server = SERVERS.NA;
      } else {
        server = SERVERS.EU; // Default to EU for other hours (currently none)
      }
    }

    // Connect Lobby and Game Server
    lobbyClient = new LobbyClient({ server });
    MultiplayerBlankWhiteCardsClient = Client({
      game: BlankWhiteCards,
      board: BlankWhiteCardsBoard,
      debug: false,
      multiplayer: SocketIO({ server }),
    });
  } else {
    // Connect to Default Lobby and Game Servers
    lobbyClient = new LobbyClient({ server: import.meta.env.VITE_DEFAULT_LOBBY_SERVER });
    MultiplayerBlankWhiteCardsClient = Client({
      game: BlankWhiteCards,
      board: BlankWhiteCardsBoard,
      debug: false,
      multiplayer: SocketIO({ server: import.meta.env.VITE_DEFAULT_GAME_SERVER }),
    });
  }
}

export const parsePathCode = () => {
  const pathname = window.location.pathname;
  if (pathname.match(/^\/[BCDFGHJKLMNPQRSTVWXZ]{4}$/i)) {
    const room = pathname.slice(1, 5).toUpperCase();
    return room
  } else {
    return
  }
}

// API Client
const submitEndpoint = import.meta.env.MODE === 'development' ? '' : `${import.meta.env.VITE_API_SERVER}/white/submit`
export const submitGlobalCard = async (createdCard: Card) => {
  return (await fetch(submitEndpoint, {
    method: "POST",
    body: JSON.stringify({
      title: createdCard.content.title,
      description: createdCard.content.description,
      author: createdCard.content.author,
      image: createdCard.content.image,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  }))
}

export const likeGlobalCard = async (id: number) => {
  const likeEndpoint = import.meta.env.MODE === 'development' ? undefined : `${import.meta.env.VITE_API_SERVER}/white/like/${id}`
  if (likeEndpoint) {
    await fetch(likeEndpoint, { method: "POST" })
  }
}
