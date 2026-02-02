import { useState, useCallback, useEffect } from 'react';
import { Card } from '../Cards';
import { GameState } from '../Game';
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

  const saveDeck = useCallback(() => {
    const filename = deck.name;
    
    const gameState: GameState = { cards: deck.cards };
    
    // Strip unnecessary data and format for export
    const strippedCards = gameState.cards.map((card) => ({
      id: card.id,
      content: card.content,
      location: 'deck',
      likes: (card?.likes && card.likes > 0 && card.likes < 1_000_000_000) ? card.likes : undefined,
    }));

    // Create data string
    const rawData = btoa(encodeURI(JSON.stringify(strippedCards)));

    // Create download
    const today = new Date();
    const datetime = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, "0") + '-' + today.getDate().toString().padStart(2, "0") + "_" + today.getHours().toString().padStart(2, "0") + today.getMinutes().toString().padStart(2, "0") + today.getSeconds().toString().padStart(2, "0");
    
    // Use existing deck export format from data.ts
    const outputHTML = createDeckHTML(rawData);
    
    const dltemp = document.createElement('a');
    dltemp.setAttribute("href", 'data:text/html;charset=utf-8,' + encodeURIComponent(outputHTML));
    dltemp.setAttribute("download", `${filename}_${datetime}.html`);
    dltemp.style.display = "none";
    document.body.append(dltemp);
    dltemp.click();
    document.body.removeChild(dltemp);

    // Mark as saved
    updateDeck(prev => ({ ...prev, modified: false }));
  }, [deck]);

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
    saveDeck,
    addCard,
    updateCard,
    deleteCard,
    duplicateDeck,
    mergeDeck,
    updateDeck,
    setDeckName: (name: string) => updateDeck(prev => ({ ...prev, name, modified: true }))
  };
};

// Helper function to create deck HTML (simplified version of data.ts format)
const createDeckHTML = (rawData: string) => {
  return `<!DOCTYPE html><html><head><script>const rawData = '${rawData}'; const cards = JSON.parse(decodeURI(atob(rawData)));</script><title>Blank White Cards Deck</title><link rel="icon" type="image/png" href="https://blankwhite.cards/favicon.png"/><meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" /><style>body{font-family:"Patrick Hand SC",Arial,sans-serif;background:grey;margin:0;padding:1em;}.card{background:white;border:2px solid black;border-radius:8px;margin:1em;padding:1em;}</style></head><body><h1>Blank White Cards Deck</h1><div id="cards"></div><script>cards.forEach(card=>{const div=document.createElement('div');div.className='card';div.innerHTML='<h3>'+card.content.title+'</h3><p>'+card.content.description+'</p><small>by '+card.content.author+'</small>';document.getElementById('cards').appendChild(div);});</script></body></html>`;
};
