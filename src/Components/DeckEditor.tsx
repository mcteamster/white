import { useState, useRef, useMemo, useEffect } from 'react';
import { Icon } from './Icons';
import { CardCreator } from './CardCreator';
import { useDeckEditor } from '../lib/deckEditor';
import { sanitiseCard } from '../lib/data';
import { Card } from '../Cards';
import { BLANK_IMAGE, decompressImage } from '../lib/images';

// Card Display Components for different view modes
function FullCardView({ card }: { card: Card }) {
  return (
    <wired-card key={card.id} style={{ 
      padding: '0.75em',
      height: '280px',
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
    </wired-card>
  );
}

function CompactCardView({ card }: { card: Card }) {
  return (
    <wired-card key={card.id} style={{ 
      padding: '0.5em',
      height: '100px',
      width: '100%',
      maxWidth: '600px',
      backgroundColor: 'white'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1em',
        height: '100%'
      }}>
        {/* Thumbnail */}
        <div style={{
          width: '100px',
          height: '100px',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {card.content.image ? (
            <CardImage card={card} />
          ) : (
            <div style={{ color: '#999', fontSize: '0.7em' }}>No Image</div>
          )}
        </div>
        
        {/* Title and Description */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
          <h4 style={{ margin: '0 0 0.25em 0', fontSize: '1em' }}>{card.content.title}</h4>
          <p style={{ margin: 0, fontSize: '0.8em', color: '#666' }}>{card.content.description}</p>
        </div>
      </div>
    </wired-card>
  );
}

function ImageOnlyCardView({ card }: { card: Card }) {
  return (
    <wired-card key={card.id} style={{ 
      padding: '0.25em',
      height: '60px',
      width: '60px',
      backgroundColor: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {/* Image Only */}
      <div style={{
        width: '50px',
        height: '50px',
        backgroundColor: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}>
        {card.content.image ? (
          <CardImage card={card} />
        ) : (
          <div style={{ color: '#999', fontSize: '0.7em', textAlign: 'center' }}>No Image</div>
        )}
      </div>
    </wired-card>
  );
}
function CardImage({ card }: { card: Card }) {
  const [imageSrc, setImageSrc] = useState(BLANK_IMAGE);

  const handleQuotaExceeded = (e: any) => {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded, clearing old cache entries');
      clearOldCacheEntries();
    }
  };

  const clearOldCacheEntries = () => {
    const cacheEntries: Array<{key: string, timestamp: number}> = [];
    
    // Collect all editor cache entries with timestamps
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('editor_image_')) {
        const timestampKey = `${key}_timestamp`;
        const timestamp = parseInt(localStorage.getItem(timestampKey) || '0');
        cacheEntries.push({ key, timestamp });
      }
    });

    // Sort by timestamp (oldest first) and remove oldest 50%
    cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = Math.ceil(cacheEntries.length * 0.5);
    
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(cacheEntries[i].key);
      localStorage.removeItem(`${cacheEntries[i].key}_timestamp`);
    }
  };

  const setCacheWithTimestamp = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      localStorage.setItem(`${key}_timestamp`, Date.now().toString());
    } catch (e) {
      handleQuotaExceeded(e);
      // Try once more after cleanup
      try {
        localStorage.setItem(key, value);
        localStorage.setItem(`${key}_timestamp`, Date.now().toString());
      } catch (e2) {
        console.warn('Still cannot cache image after cleanup');
      }
    }
  };

  useEffect(() => {
    // Check editor-specific cache first
    const cacheKey = `editor_image_${card.id}`;
    
    try {
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        // Update timestamp for LRU
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
        setImageSrc(cached);
        return;
      }

      if (card.content.image?.startsWith('data:image/png;base64,')) {
        // PNG Data URI
        setImageSrc(card.content.image);
        setCacheWithTimestamp(cacheKey, card.content.image);
      } else if (card.content.image) {
        // Compressed image - decompress it
        decompressImage(card.content.image).then(decompressed => {
          setImageSrc(decompressed);
          setCacheWithTimestamp(cacheKey, decompressed);
        });
      } else {
        setImageSrc(BLANK_IMAGE);
      }
    } catch (e) {
      console.error('Error loading image:', e);
      setImageSrc(BLANK_IMAGE);
    }
  }, [card.id, card.content.image]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
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
    saveDeck,
    addCard,
    updateDeck
  } = useDeckEditor();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCardCreator, setShowCardCreator] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [loadedDeckData, setLoadedDeckData] = useState<{cards: Card[], name: string} | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'compact' | 'image'>('full');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Update document title when deck name changes
  useEffect(() => {
    document.title = `Editor - ${deck.name}`;
  }, [deck.name]);

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
    addCard(card);
    setShowCardCreator(false);
  };

  const handleCardCancel = () => {
    setShowCardCreator(false);
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
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '1em'
        }}>
          {/* Load Button - Left */}
          <wired-card style={{ 
            height: '3em',
            width: '3em',
            margin: '0.25em',
            fontWeight: 'bold',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#eee',
            borderRadius: '1em',
            cursor: 'pointer'
          }} onClick={() => fileInputRef.current?.click()} elevation={2}>
            <Icon name="display" /> Load
          </wired-card>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html"
            onChange={handleFileLoad}
            style={{ display: 'none' }}
          />

          {/* Center - Title */}
          <div style={{ textAlign: 'center', flex: 1, margin: '0 1em' }}>
            <h1 style={{ margin: 0, fontSize: '1.5em' }}>
              Deck Editor (Beta)
              {deck.modified && <span style={{ color: 'orange', marginLeft: '0.5em' }}>●</span>}
            </h1>
            
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25em', marginTop: '0.5em' }}>
              <wired-card 
                style={{ 
                  padding: '0.5em', 
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'full' ? '#ccc' : 'white',
                  color: 'black',
                  borderRadius: '1em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => setViewMode('full')}
              >
                <Icon name="stop" />
              </wired-card>
              <wired-card 
                style={{ 
                  padding: '0.5em', 
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'compact' ? '#ccc' : 'white',
                  color: 'black',
                  borderRadius: '1em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => setViewMode('compact')}
              >
                <Icon name="view_list" />
              </wired-card>
              <wired-card 
                style={{ 
                  padding: '0.5em', 
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'image' ? '#ccc' : 'white',
                  color: 'black',
                  borderRadius: '1em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => setViewMode('image')}
              >
                <Icon name="view_module" />
              </wired-card>
            </div>
          </div>

          {/* Save Button - Right */}
          <wired-card 
            style={{ 
              height: '3em',
              width: '3em',
              margin: '0.25em',
              fontWeight: 'bold',
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#eee',
              borderRadius: '1em',
              cursor: deck.cards.length === 0 ? 'not-allowed' : 'pointer',
              opacity: deck.cards.length === 0 ? 0.5 : 1,
              color: deck.cards.length === 0 ? 'grey' : undefined
            }}
            onClick={deck.cards.length === 0 ? undefined : saveDeck}
            elevation={2}
          >
            <Icon name="take" /> Save
          </wired-card>
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
          filteredCards.map(card => {
            if (viewMode === 'full') {
              return <FullCardView key={card.id} card={card} />;
            } else if (viewMode === 'compact') {
              return <CompactCardView key={card.id} card={card} />;
            } else {
              return <ImageOnlyCardView key={card.id} card={card} />;
            }
          })
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
          <wired-card 
            style={{ 
              height: '3em',
              width: '3em',
              margin: '0.25em',
              fontWeight: 'bold',
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#eee',
              borderRadius: '1em',
              cursor: 'pointer'
            }}
            onClick={() => setShowCardCreator(true)}
            elevation={2}
          >
            <Icon name="create" /> Create
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
