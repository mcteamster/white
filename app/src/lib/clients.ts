// Clients
import { LobbyClient } from '@mcteamster/white-engine/client';
import { Client } from '@mcteamster/white-engine/react';
import { SocketIO } from '@mcteamster/white-engine/multiplayer';
import { BlankWhiteCards, GameState } from '@mcteamster/white-core';
import { BlankWhiteCardsBoard } from '../Board';
import { Card } from '@mcteamster/white-core';

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
});

// Multiplayer Custom Rooms
export type Region = 'AP' | 'EU' | 'NA' | 'custom';

export const SERVERS: Record<string, string> = {
  'AP': 'https://ap.blankwhite.cards',
  'EU': 'https://eu.blankwhite.cards',
  'NA': 'https://na.blankwhite.cards',
};

const CUSTOM_SERVER_KEY = 'customServerUrl';
const DEFAULT_CUSTOM_SERVER = 'http://localhost:3000';

export function getCustomServer(): string {
  return localStorage.getItem(CUSTOM_SERVER_KEY) || DEFAULT_CUSTOM_SERVER;
}

export function setCustomServer(url: string): void {
  localStorage.setItem(CUSTOM_SERVER_KEY, url);
}

export function getServerUrl(region: Region): string {
  if (region === 'custom') return getCustomServer();
  return SERVERS[region];
}

// Lazy client factories with URL-keyed caches
const lobbyClientCache = new Map<string, LobbyClient>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gameClientCache = new Map<string, any>();

export function getLobbyClient(region: Region): LobbyClient {
  const url = getServerUrl(region);
  if (!lobbyClientCache.has(url)) {
    lobbyClientCache.set(url, new LobbyClient({ server: url }));
  }
  return lobbyClientCache.get(url)!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getGameClient(region: Region): any {
  const url = getServerUrl(region);
  if (!gameClientCache.has(url)) {
    gameClientCache.set(url, Client({
      game: BlankWhiteCards,
      board: BlankWhiteCardsBoard,
      multiplayer: SocketIO({ server: url }),
    }));
  }
  return gameClientCache.get(url)!;
}

export const getRegion = (room: string): Region => {
  if (import.meta.env.VITE_MULTI_REGION === 'true') {
    if (room.match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/)) {
      if (room.match(/[BCDFG]$/)) {
        return 'AP';
      } else if (room.match(/[HJKLM]$/)) {
        return 'EU';
      } else if (room.match(/[NPQRS]$/)) {
        return 'NA';
      } else { // Custom server (TVWXZ)
        return 'custom';
      }
    }
  }
  return 'custom';
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
