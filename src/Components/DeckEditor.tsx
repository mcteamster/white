import { useState, useRef, useMemo, useCallback, useEffect, useContext } from 'react';
import { Link } from 'react-router';
import { Icon } from './Icons';
import { CardCreator } from './CardCreator';
import { useDeckEditor } from '../lib/deckEditor';
import { sanitiseCard } from '../lib/data';
import { Card } from '../Cards';
import { BLANK_IMAGE, decompressImage } from '../lib/images';
import { ImageCacheContext } from '../lib/contexts';

// Card Image Component with Editor Cache
function CardImage({ card }: { card: Card }) {
  const [imageSrc, setImageSrc] = useState(BLANK_IMAGE);

  useEffect(() => {
    // Check editor-specific cache first
    const cacheKey = `editor_image_${card.id}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      setImageSrc(cached);
      return;
    }

    if (card.content.image?.startsWith('data:image/png;base64,')) {
      // PNG Data URI
      setImageSrc(card.content.image);
      localStorage.setItem(cacheKey, card.content.image);
    } else if (card.content.image) {
      // Compressed image - decompress it
      decompressImage(card.content.image).then(decompressed => {
        setImageSrc(decompressed);
        localStorage.setItem(cacheKey, decompressed);
      });
    } else {
      setImageSrc(BLANK_IMAGE);
    }
  }, [card.id, card.content.image]);

  return (
    <div style={{
      width: '100%',
      height: '80%',
      backgroundImage: `url(${imageSrc})`,
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center'
    }} />
  );
}

export function DeckEditor() {
  const {
    deck,
    createNewDeck,
    loadDeckFromFile,
    saveDeck,
    addCard,
    updateCard,
    deleteCard,
    duplicateDeck,
    setDeckName
  } = useDeckEditor();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCardCreator, setShowCardCreator] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [loadedDeckData, setLoadedDeckData] = useState<{cards: Card[], name: string} | null>(null);
  const mergeFileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleFileLoad = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const html = e.target?.result as string;
          const match = html.match(/const rawData =\s*'([^']+)'/);
          if (!match) {
            throw new Error('Invalid deck file format');
          }
          
          const rawData = match[1];
          const cardsData = JSON.parse(decodeURI(atob(rawData)));
          
          const cards = cardsData.map((card: any, index: number) => {
            const sanitized = sanitiseCard(card);
            sanitized.id = index + 1;
            sanitized.location = 'deck';
            return sanitized;
          });

          const deckData = {
            cards,
            name: file.name.replace(/\.[^/.]+$/, '') || 'Loaded Deck'
          };

          // If current deck is empty, just load directly
          if (deck.cards.length === 0) {
            updateDeck({
              cards: deckData.cards,
              name: deckData.name,
              modified: false
            });
            setLoading(false);
          } else {
            // Show dialog to choose replace or merge
            setLoadedDeckData(deckData);
            setShowLoadDialog(true);
            setLoading(false);
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to load deck');
          setLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
      setLoading(false);
    }
  };

  const handleReplaceDeck = () => {
    if (loadedDeckData) {
      updateDeck({
        cards: loadedDeckData.cards,
        name: loadedDeckData.name,
        modified: false
      });
    }
    setShowLoadDialog(false);
    setLoadedDeckData(null);
  };

  const handleMergeDecks = () => {
    if (loadedDeckData) {
      const maxId = Math.max(...deck.cards.map(c => c.id), 0);
      const mergedCards = loadedDeckData.cards.map((card, index) => ({
        ...card,
        id: maxId + index + 1
      }));
      
      updateDeck({
        ...deck,
        cards: [...deck.cards, ...mergedCards],
        name: `${deck.name} + ${loadedDeckData.name}`,
        modified: true
      });
    }
    setShowLoadDialog(false);
    setLoadedDeckData(null);
  };

  const handleCardSave = (card: Omit<Card, 'id'>) => {
    if (editingCard) {
      updateCard(editingCard.id, card);
    } else {
      addCard(card);
    }
    setShowCardCreator(false);
    setEditingCard(undefined);
  };

  const handleCardCancel = () => {
    setShowCardCreator(false);
    setEditingCard(undefined);
  };

  const handleEditCard = (card: Card) => {
    setEditingCard(card);
    setShowCardCreator(true);
  };

  const filteredCards = useMemo(() => {
    if (debouncedSearchTerm === '') return deck.cards;
    
    const query = debouncedSearchTerm.toUpperCase();
    return deck.cards.filter(card => {
      // Search by ID
      if (card.id === Number(debouncedSearchTerm)) {
        return true;
      }
      // Search by title, description, or author
      return card.content.title.toUpperCase().includes(query) ||
             card.content.description.toUpperCase().includes(query) ||
             card.content.author?.toUpperCase().includes(query);
    });
  }, [deck.cards, debouncedSearchTerm]);

  const deckStats = {
    totalCards: deck.cards.length
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f0f0f0'
    }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: 'white',
        borderBottom: '2px solid #ccc',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Top Row - Title */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '1em 2em'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1 style={{ 
              margin: 0, 
              fontSize: '1.5em'
            }}>Deck Editor</h1>
            {deck.modified && <span style={{ color: 'orange', marginLeft: '0.5em' }}>●</span>}
          </div>
          <div style={{ 
            fontSize: '0.9em',
            color: '#666',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '80%'
          }}>{deck.name}</div>
        </div>
      </div>

      {/* Cards Background */}
      <div style={{ 
        flex: 1, 
        padding: '1em',
        overflowY: 'auto',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1em',
        alignContent: 'flex-start',
        justifyContent: 'center'
      }}>
        {showCardCreator ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <CardCreator 
              onSave={handleCardSave}
              onCancel={handleCardCancel}
              editingCard={editingCard}
            />
          </div>
        ) : filteredCards.length === 0 ? (
          <div style={{ 
            gridColumn: '1 / -1',
            textAlign: 'center', 
            padding: '4em 2em', 
            color: '#666',
            fontSize: '1.2em'
          }}>
            {debouncedSearchTerm ? 'No cards match your search.' : 'No cards in deck. Create a new card or load an existing deck.'}
          </div>
        ) : (
          filteredCards.map(card => (
            <wired-card key={card.id} style={{ 
              padding: '0.75em',
              height: '320px',
              width: '280px',
              backgroundColor: 'white',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              {/* Card Preview */}
              <div style={{
                width: '100%',
                aspectRatio: '1',
                backgroundColor: 'white',
                marginBottom: '0.5em',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '0.8em',
                textAlign: 'center',
                overflow: 'hidden'
              }}>
                {card.content.image ? (
                  <CardImage card={card} />
                ) : (
                  <div style={{ color: '#999', fontSize: '0.8em' }}>No Image</div>
                )}
              </div>
              
              {/* Card Details */}
              <div style={{ marginBottom: '0.5em' }}>
                <h4 style={{ margin: '0 0 0.25em 0' }}>{card.content.title}</h4>
                <p style={{ margin: '0 0 0.25em 0', fontSize: '0.85em' }}>{card.content.description}</p>
                <small>by {card.content.author}</small>
                {card.likes && <div style={{ fontSize: '0.8em', color: '#666' }}>❤️ {card.likes}</div>}
              </div>
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5em', justifyContent: 'center' }}>
                <wired-card 
                  style={{ padding: '0.25em 0.5em', cursor: 'pointer', flex: 1, textAlign: 'center' }}
                  onClick={() => handleEditCard(card)}
                >
                  ✏️ Edit
                </wired-card>
                <wired-card 
                  style={{ padding: '0.25em 0.5em', cursor: 'pointer', color: 'red' }}
                  onClick={() => deleteCard(card.id)}
                >
                  ✕
                </wired-card>
              </div>
            </wired-card>
          ))
        )}
      </div>

      {/* Bottom Controls */}
      <div style={{ 
        backgroundColor: 'white',
        borderTop: '2px solid #ccc',
        padding: '1em 2em',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1em'
      }}>
        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '0.5em',
          flexWrap: 'wrap'
        }}>
          <wired-card style={{ padding: '0.5em', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
            <Icon name="upload" /> Load
          </wired-card>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html"
            onChange={handleFileLoad}
            style={{ display: 'none' }}
          />
          
          <wired-card 
            style={{ 
              padding: '0.5em', 
              cursor: deck.cards.length === 0 ? 'not-allowed' : 'pointer',
              opacity: deck.cards.length === 0 ? 0.5 : 1
            }}
            onClick={deck.cards.length === 0 ? undefined : saveDeck}
          >
            <Icon name="take" /> Save
          </wired-card>

          <wired-card 
            style={{ padding: '0.5em', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white' }}
            onClick={() => setShowCardCreator(true)}
          >
            <Icon name="add" /> Add Card
          </wired-card>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em', maxWidth: '90vw' }}>
          <Icon name="search" />
          <wired-input
            id="deckEditorSearch"
            placeholder={`Search from ${deck.cards.length} cards...`}
            value={searchTerm}
            onInput={(e: any) => setSearchTerm(e.target.value)}
            style={{ width: '250px', maxWidth: 'calc(90vw - 100px)' }}
          />
          <div onClick={() => {
            setSearchTerm('');
            const input = document.getElementById('deckEditorSearch') as any;
            if (input) input.value = '';
          }} style={{ cursor: 'pointer' }}>
            <Icon name="exit" />
          </div>
        </div>

        {loading && <div style={{ color: 'blue' }}>Loading...</div>}
        {error && <div style={{ color: 'red' }}>{error}</div>}

        {showLoadDialog && loadedDeckData && (
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            zIndex: 1000
          }}>
            <wired-card style={{ 
              backgroundColor: 'white', 
              padding: '2em', 
              maxWidth: '400px'
            }}>
              <h3>Load Deck</h3>
              <p>You have cards in your current deck. What would you like to do with "{loadedDeckData.name}"?</p>
              <div style={{ display: 'flex', gap: '1em', justifyContent: 'center', flexWrap: 'wrap' }}>
                <wired-card style={{ padding: '0.5em 1em', cursor: 'pointer' }} onClick={() => setShowLoadDialog(false)}>
                  Cancel
                </wired-card>
                <wired-card style={{ padding: '0.5em 1em', cursor: 'pointer' }} onClick={handleMergeDecks}>
                  Add to Current
                </wired-card>
                <wired-card style={{ padding: '0.5em 1em', cursor: 'pointer', backgroundColor: '#f44336', color: 'white' }} onClick={handleReplaceDeck}>
                  Replace Current
                </wired-card>
              </div>
            </wired-card>
          </div>
        )}
      </div>
    </div>
  );
}
