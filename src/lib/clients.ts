// Clients
import { LobbyClient } from 'boardgame.io/client';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { BlankWhiteCards, GameState } from '../Game';
import { BlankWhiteCardsBoard } from '../Board';
import { Card } from '../Cards';
import { initaliseDiscord } from './discord';

// Initialise Discord
initaliseDiscord();

// Global Deck Singleplayer
export let startingDeck: GameState = { cards: [] };
export let deckLoading = true;

// Listeners for deck updates
const deckUpdateListeners: Set<() => void> = new Set();
export const onDeckUpdate = (callback: () => void) => {
  deckUpdateListeners.add(callback);
  return () => { deckUpdateListeners.delete(callback); };
};

const notifyDeckUpdate = () => {
  deckUpdateListeners.forEach(cb => cb());
};

const fetchGlobalDeck = async () => {
  try {
    const fetchChunk = async (chunk: number): Promise<GameState | null> => {
      try {
        return await (await fetch(`/decks/global_${chunk}01.json`)).json();
      } catch {
        return null;
      }
    };

    // Try fetching first 10 chunks in parallel
    const chunks = await Promise.all(
      Array.from({ length: 10 }, (_, i) => fetchChunk(i))
    );

    // Add cards in order and notify
    for (const chunk of chunks) {
      if (chunk?.cards) {
        startingDeck.cards.push(...chunk.cards);
        notifyDeckUpdate();
      } else {
        break; // Stop at first missing chunk
      }
    }
    
    deckLoading = false;
    notifyDeckUpdate();
  } catch (e) {
    console.error(e)
    deckLoading = false;
    notifyDeckUpdate();
  }
};

// Start fetching after a short delay
setTimeout(fetchGlobalDeck, 100);

export const GlobalBlankWhiteCardsClient = Client({
  game: { ...BlankWhiteCards, setup: () => (startingDeck) },
  board: BlankWhiteCardsBoard,
  debug: false,
});

// Multiplayer Custom Rooms
export const SERVERS = {
  'AP': 'https://ap.blankwhite.cards',
  'EU': 'https://eu.blankwhite.cards',
  'NA': 'https://na.blankwhite.cards',
}

export const lobbyClients: Record<'AP' | 'EU' | 'NA' | 'default', LobbyClient> = {
  AP: new LobbyClient({ server: SERVERS.AP }),
  EU: new LobbyClient({ server: SERVERS.EU }),
  NA: new LobbyClient({ server: SERVERS.NA }),
  default: new LobbyClient({ server: import.meta.env.VITE_DEFAULT_SERVER }),
};

export const gameClients = {
  AP: Client({
    game: BlankWhiteCards,
    board: BlankWhiteCardsBoard,
    debug: false,
    multiplayer: SocketIO({ server: SERVERS.AP }),
  }),
  EU: Client({
    game: BlankWhiteCards,
    board: BlankWhiteCardsBoard,
    debug: false,
    multiplayer: SocketIO({ server: SERVERS.EU }),
  }),
  NA: Client({
    game: BlankWhiteCards,
    board: BlankWhiteCardsBoard,
    debug: false,
    multiplayer: SocketIO({ server: SERVERS.NA }),
  }),
  default: Client({
    game: BlankWhiteCards,
    board: BlankWhiteCardsBoard,
    debug: false,
    multiplayer: SocketIO({ server: import.meta.env.VITE_DEFAULT_SERVER }),
  }),
}

export const getRegion = (room: string) => {
  if (import.meta.env.VITE_MULTI_REGION === 'true') {
    // This implementation is specific to a 3 global region server setup, adjust balancing accordingly here and in server.ts
    if (room.match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/)) {
      // Set server region based on room code
      if (room.match(/[BCDFG]$/)) {
        return 'AP';
      } else if (room.match(/[HJKLM]$/)) {
        return 'EU';
      } else if (room.match(/[NPQRS]$/)) {
        return 'NA';
      } else { // Fallback to default server (TVWXZ)
        return 'default';
      }
    }
  }
  return 'default';
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
