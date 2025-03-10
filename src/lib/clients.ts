// Clients
import { LobbyClient } from 'boardgame.io/client';
import { Game } from 'boardgame.io';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { BlankWhiteCards, GameState } from '../Game';
import { BlankWhiteCardsBoard } from '../Board';
import { Card } from '../Cards';

// Lobby
export const lobbyClient = new LobbyClient({ server: (import.meta.env.VITE_LOBBY_SERVER) });

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

// API Client
const submitEndpoint = import.meta.env.MODE === 'development' ? '' : `${import.meta.env.VITE_API_SERVER}/white/submit`
export const submitGlobalCard = async (createdCard: Card) => {
  await fetch(submitEndpoint, {
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
  })
}

export const likeGlobalCard = async (id: number) => {
  const likeEndpoint = import.meta.env.MODE === 'development' ? undefined : `${import.meta.env.VITE_API_SERVER}/white/like/${id}`
  if (likeEndpoint) {
    await fetch(likeEndpoint, { method: "POST" })
  }
}
