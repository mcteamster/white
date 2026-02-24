// Clients
import { LobbyClient } from 'boardgame.io/client';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { BlankWhiteCards, GameState } from '../Game';
import { BlankWhiteCardsBoard } from '../Board';
import { Card } from '../Cards';

// Global Deck Singleplayer
export const startingDeck: GameState = { cards: [] };
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
    // Try to fetch manifest first
    let chunkCount: number | null = null;
    try {
      const manifest = await (await fetch('/decks/global_manifest.json')).json();
      if (manifest.chunks && typeof manifest.chunks === 'number') {
        chunkCount = manifest.chunks;
      }
    } catch {
      // Manifest fetch failed, will fall back to old behavior
    }

    const fetchChunk = async (chunk: number, retries = 3): Promise<{ chunk: number; data: GameState | null }> => {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const data = await (await fetch(`/decks/global_${chunk}01.json`)).json();
          return { chunk, data };
        } catch {
          if (attempt === retries - 1) return { chunk, data: null };
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
      return { chunk, data: null };
    };

    if (chunkCount !== null) {
      // Use manifest to fetch all chunks in parallel
      const chunks = Array.from({ length: chunkCount }, (_, i) => i);
      const results = await Promise.all(chunks.map(i => fetchChunk(i)));
      
      results
        .filter(r => r.data?.cards)
        .sort((a, b) => a.chunk - b.chunk)
        .forEach(r => startingDeck.cards.push(...r.data!.cards));
      
      notifyDeckUpdate();
    } else {
      // Fallback: Fetch first chunk to determine if deck exists
      const first = await fetchChunk(0);
      if (!first.data?.cards) {
        deckLoading = false;
        notifyDeckUpdate();
        return;
      }
      
      startingDeck.cards.push(...first.data.cards);
      notifyDeckUpdate();

      // Fetch remaining chunks in parallel batches
      const BATCH_SIZE = 2;
      let chunkIndex = 1;
      
      while (chunkIndex < 100) {
        const batch = Array.from({ length: BATCH_SIZE }, (_, i) => chunkIndex + i)
          .filter(i => i < 100)
          .map(i => fetchChunk(i));
        
        const results = await Promise.all(batch);
        const validResults = results
          .filter(r => r.data?.cards)
          .sort((a, b) => a.chunk - b.chunk);
        
        if (validResults.length === 0) break;
        
        validResults.forEach(r => startingDeck.cards.push(...r.data!.cards));
        notifyDeckUpdate();
        
        if (validResults.length < batch.length) break;
        chunkIndex += BATCH_SIZE;
      }
    }
    
    deckLoading = false;
    notifyDeckUpdate();
  } catch {
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
const submitEndpoint = import.meta.env.MODE === 'development' ? '' : `${import.meta.env.VITE_CARD_API}/v1/submit`
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

export const likeGlobalCard = async (id: number): Promise<number | null> => {
  const likeEndpoint = import.meta.env.VITE_CARD_API ? `${import.meta.env.VITE_CARD_API}/v1/like/${id}` : undefined
  if (likeEndpoint) {
    const response = await fetch(likeEndpoint, { method: "POST" })
    if (response.ok) {
      const data = await response.json()
      return data.likes
    }
  }
  return null
}
