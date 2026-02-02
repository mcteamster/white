import { useState, useCallback, useEffect } from 'react';
import { Card } from '../Cards';
import { sanitiseCard } from './data';
import { dbManager } from './indexedDB';

export interface DeckEditorState {
  cards: Card[];
  name: string;
  modified: boolean;
}

export const useDeckEditor = () => {
  const [deck, setDeck] = useState<DeckEditorState>(() => {
    return {
      cards: [],
      name: 'New Deck',
      modified: false
    };
  });

  // Load from IndexedDB on mount
  useEffect(() => {
    const loadDeck = async () => {
      try {
        const savedDeck = await dbManager.get('deckEditor_currentDeck');
        if (savedDeck) {
          setDeck(savedDeck);
        }
      } catch (error) {
        console.warn('Failed to load deck from IndexedDB:', error);
      }
    };
    loadDeck();
  }, []);

  // Save to IndexedDB whenever deck changes
  const updateDeck = useCallback(async (newDeck: DeckEditorState | ((prev: DeckEditorState) => DeckEditorState)) => {
    const updatedDeck = typeof newDeck === 'function' ? newDeck(deck) : newDeck;
    setDeck(updatedDeck);
    try {
      await dbManager.set('deckEditor_currentDeck', updatedDeck);
    } catch (error) {
      console.warn('Failed to save deck to IndexedDB:', error);
    }
  }, [deck]);

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
    updateDeck(prev => ({
      ...prev,
      cards: [...prev.cards, { ...card, id: prev.cards.length + 1 }],
      modified: true
    }));
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
