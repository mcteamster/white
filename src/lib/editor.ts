import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router';
import { Card } from '../Cards';
import { sanitiseCard } from './data';
import { dbManager } from './indexedDB';
import { getRegion, SERVERS } from './clients';

export interface DeckEditorState {
  cards: Card[];
  name: string;
  modified: boolean;
}

export const useDeckEditor = () => {
  const { deckId, timestamp } = useParams<{ deckId?: string; timestamp?: string }>();
  const storageKey = (deckId && timestamp) ? `deckEditor_${deckId}_${timestamp}` : 'deckEditor_currentDeck';
  
  const [deck, setDeck] = useState<DeckEditorState>(() => {
    return {
      cards: [],
      name: 'New Deck',
      modified: false
    };
  });

  // Load from IndexedDB or server on mount
  useEffect(() => {
    const loadDeck = async () => {
      // Try IndexedDB first
      try {
        const savedDeck = await dbManager.get(storageKey);
        if (savedDeck) {
          setDeck(savedDeck);
          return;
        }
      } catch (error) {
        console.warn('Failed to load deck from IndexedDB:', error);
      }
      
      // If not in IndexedDB and deckId exists, fetch from server
      if (deckId) {
        try {
          const region = getRegion(deckId);
          const serverUrl = region === 'default' ? import.meta.env.VITE_DEFAULT_SERVER : SERVERS[region];
          const response = await fetch(`${serverUrl}/export/${deckId}`);
          if (response.ok) {
            const rawData = await response.text();
            const cardsData = JSON.parse(decodeURI(atob(rawData)));
            const cards = cardsData.map((card: any) => sanitiseCard(card));
            const loadedDeck = {
              cards,
              name: `Deck from ${deckId}`,
              modified: false
            };
            setDeck(loadedDeck);
            // Save to IndexedDB for future loads
            dbManager.set(storageKey, loadedDeck).catch(error => {
              console.warn('Failed to save deck to IndexedDB:', error);
            });
            return;
          }
        } catch (error) {
          console.error('Failed to load deck from server:', error);
        }
      }
    };
    loadDeck();
  }, [deckId, timestamp, storageKey]);

  // Save to IndexedDB whenever deck changes
  const updateDeck = useCallback(async (newDeck: DeckEditorState | ((prev: DeckEditorState) => DeckEditorState)) => {
    setDeck(prev => {
      const updatedDeck = typeof newDeck === 'function' ? newDeck(prev) : newDeck;
      // Save to IndexedDB asynchronously
      dbManager.set(storageKey, updatedDeck).catch(error => {
        console.warn('Failed to save deck to IndexedDB:', error);
      });
      return updatedDeck;
    });
  }, [storageKey]);

  const createNewDeck = useCallback(() => {
    const newDeck = {
      cards: [],
      name: 'New Deck',
      modified: false
    };
    updateDeck(newDeck);
  }, []);

  const loadDeckFromFile = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const html = e.target?.result as string;
          
          // Extract JSON data from HTML file
          const match = html.match(/const rawData =\s*'([^']+)'/);
          if (!match) {
            throw new Error('Invalid deck file format');
          }
          
          const rawData = match[1];
          const cardsData = JSON.parse(decodeURI(atob(rawData)));
          
          // Sanitize and process cards
          const cards = cardsData.map((card: any, index: number) => {
            const sanitized = sanitiseCard(card);
            sanitized.id = index + 1;
            sanitized.location = 'deck';
            return sanitized;
          });

          const newDeck = {
            cards,
            name: file.name.replace(/\.[^/.]+$/, '') || 'Loaded Deck',
            modified: false
          };
          updateDeck(newDeck);
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  const addCard = useCallback((card: Omit<Card, 'id'>) => {
    updateDeck(prev => {
      const maxId = prev.cards.length > 0 ? Math.max(...prev.cards.map(c => c.id)) : 0;
      return {
        ...prev,
        cards: [...prev.cards, { ...card, id: maxId + 1 }],
        modified: true
      };
    });
  }, []);

  const updateCard = useCallback((id: number, updates: Partial<Card>) => {
    updateDeck(prev => ({
      ...prev,
      cards: prev.cards.map(card => 
        card.id === id ? { ...card, ...updates } : card
      ),
      modified: true
    }));
  }, []);

  const deleteCard = useCallback((id: number) => {
    updateDeck(prev => ({
      ...prev,
      cards: prev.cards.filter(card => card.id !== id),
      modified: true
    }));
  }, []);

  const duplicateDeck = useCallback(() => {
    updateDeck(prev => ({
      ...prev,
      name: `${prev.name} (Copy)`,
      modified: true
    }));
  }, []);

  const mergeDeck = useCallback((otherDeck: DeckEditorState) => {
    updateDeck(prev => {
      const maxId = Math.max(...prev.cards.map(c => c.id), 0);
      const mergedCards = otherDeck.cards.map((card, index) => ({
        ...card,
        id: maxId + index + 1
      }));
      
      return {
        ...prev,
        cards: [...prev.cards, ...mergedCards],
        name: `${prev.name} + ${otherDeck.name}`,
        modified: true
      };
    });
  }, []);

  return {
    deck,
    createNewDeck,
    loadDeckFromFile,
    addCard,
    updateCard,
    deleteCard,
    duplicateDeck,
    mergeDeck,
    updateDeck,
    setDeckName: (name: string) => updateDeck(prev => ({ ...prev, name, modified: true }))
  };
};
