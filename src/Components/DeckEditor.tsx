import { useState, useRef, useMemo, useEffect } from 'react';
import { Properties } from 'csstype';
import { Icon } from './Icons';
import { CardEditor } from './CardEditor';
import { useDeckEditor } from '../lib/deckEditor';
import { sanitiseCard } from '../lib/data';
import { Card } from '../Cards';
import { BLANK_IMAGE, decompressImage } from '../lib/images';

function FullCardView({ card }: { card: Card }) {
  let localDate;
  if (card.content.date) {
    localDate = new Date(Number(card.content.date)).toLocaleDateString();
  }

  const styles: { [key: string]: Properties<string | number> } = {
    card: {
      borderRadius: '0.5em',
      backgroundColor: 'white',
      minHeight: '20em',
      maxHeight: '36em',
      width: '20em',
      alignSelf: 'flex-start'
    },
    cardContent: {
      display: 'flex',
      flexDirection: 'column',
      textAlign: 'center',
      overflowWrap: 'anywhere',
      justifyContent: 'flex-end',
      alignItems: 'center',
      height: '100%',
      padding: '0.5em'
    },
    imageContainer: {
      width: '18em',
      height: '18em',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      flexShrink: 0,
      alignSelf: 'center'
    },
    title: {
      fontSize: '1.5em'
    },
    description: {
      width: '100%',
      height: '8em',
      fontSize: '1em',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    credit: {
      fontSize: '0.75em',
      textAlign: 'center'
    }
  };

  return (
    <wired-card key={card.id} style={styles.card} elevation={1}>
      <div style={styles.cardContent}>
        <div style={styles.imageContainer}>
          <CardImage card={card} />
        </div>
        <div style={styles.title}>{card.content.title}</div>
        <div style={styles.description}>
          {card.content.description}
        </div>
        <div style={styles.credit}>
          {card.content.author && `by ${card.content.author}`}{card.content.date && ` - ${localDate}`}
        </div>
      </div>
    </wired-card>
  );
}

function CompactCardView({ card }: { card: Card }) {
  const styles: { [key: string]: Properties<string | number> } = {
    card: {
      padding: '0.5em',
      height: '100px',
      width: '100%',
      maxWidth: '600px',
      backgroundColor: 'white'
    },
    container: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1em',
      height: '100%'
    },
    thumbnail: {
      width: '100px',
      height: '100px',
      backgroundColor: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      flexShrink: 0
    },
    content: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      height: '100%'
    },
    title: {
      margin: '0 0 0.25em 0',
      fontSize: '1em'
    },
    description: {
      margin: 0,
      fontSize: '0.8em',
      color: '#666'
    },
    noImage: {
      color: '#999',
      fontSize: '0.7em'
    }
  };

  return (
    <wired-card key={card.id} style={styles.card}>
      <div style={styles.container}>
        <div style={styles.thumbnail}>
          {card.content.image ? (
            <CardImage card={card} />
          ) : (
            <div style={styles.noImage}>No Image</div>
          )}
        </div>
        
        <div style={styles.content}>
          <h4 style={styles.title}>{card.content.title}</h4>
          <p style={styles.description}>{card.content.description}</p>
        </div>
      </div>
    </wired-card>
  );
}

function ImageOnlyCardView({ card }: { card: Card }) {
  const styles: { [key: string]: Properties<string | number> } = {
    card: {
      padding: '0.25em',
      height: '60px',
      width: '60px',
      backgroundColor: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    imageContainer: {
      width: '50px',
      height: '50px',
      backgroundColor: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden'
    },
    noImage: {
      color: '#999',
      fontSize: '0.7em',
      textAlign: 'center'
    }
  };

  return (
    <wired-card key={card.id} style={styles.card}>
      <div style={styles.imageContainer}>
        {card.content.image ? (
          <CardImage card={card} />
        ) : (
          <div style={styles.noImage}>No Image</div>
        )}
      </div>
    </wired-card>
  );
}
function CardImage({ card }: { card: Card }) {
  const [imageSrc, setImageSrc] = useState(BLANK_IMAGE);
  const [loading, setLoading] = useState(false);

  const styles: { [key: string]: Properties<string | number> } = {
    image: {
      width: '100%',
      maxWidth: '18em',
      height: '100%',
      maxHeight: '18em',
      objectFit: 'cover'
    },
    spinner: {
      width: '2em',
      height: '2em',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }
  };

  useEffect(() => {
    if (card.content.image?.startsWith('data:image/png;base64,')) {
      setImageSrc(card.content.image);
      setLoading(false);
    } else if (card.content.image) {
      setLoading(true);
      decompressImage(card.content.image).then(decompressed => {
        setImageSrc(decompressed);
        setLoading(false);
      });
    } else {
      setImageSrc(BLANK_IMAGE);
      setLoading(false);
    }
  }, [card.id, card.content.image]);

  if (loading) {
    return (
      <div style={styles.spinner} className="spin">
        <Icon name="loading" />
      </div>
    );
  }

  return (
    <img 
      src={imageSrc} 
      alt={card.content.title || 'Card image'} 
      style={styles.image}
    />
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

  const styles: { [key: string]: Properties<string | number> } = {
    container: {
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f0f0f0'
    },
    header: {
      backgroundColor: 'white',
      borderBottom: '2px solid #ccc',
      width: '100%',
      boxSizing: 'border-box'
    },
    topRow: {
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '1em'
    },
    loadButton: {
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
    },
    centerTitle: {
      textAlign: 'center',
      flex: 1,
      margin: '0 1em'
    },
    title: {
      margin: 0,
      fontSize: '1.5em'
    },
    viewModeToggle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.25em',
      marginTop: '0.5em'
    },
    viewModeButton: {
      padding: '0.5em', 
      cursor: 'pointer',
      color: 'black',
      borderRadius: '1em',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    saveButton: {
      height: '3em',
      width: '3em',
      margin: '0.25em',
      fontWeight: 'bold',
      textAlign: 'center',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#eee',
      borderRadius: '1em'
    },
    cardsContainer: {
      flex: 1, 
      padding: '1em',
      overflowY: 'auto',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '1em',
      alignContent: 'flex-start',
      justifyContent: 'center'
    },
    fullWidthContainer: {
      width: '100%'
    },
    emptyState: {
      width: '100%',
      textAlign: 'center', 
      padding: '4em 2em', 
      color: '#666',
      fontSize: '1.2em'
    },
    bottomControls: {
      backgroundColor: 'white',
      borderTop: '2px solid #ccc',
      padding: '1em 2em',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1em'
    },
    actionButtons: {
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      gap: '0.5em',
      flexWrap: 'wrap'
    },
    createButton: {
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
    },
    searchContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5em',
      maxWidth: '90vw'
    },
    searchInput: {
      width: '250px',
      maxWidth: 'calc(90vw - 100px)'
    },
    clearSearch: {
      cursor: 'pointer'
    },
    loadingText: {
      color: 'blue'
    },
    errorText: {
      color: 'red'
    },
    dialogOverlay: {
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
    },
    dialogCard: {
      backgroundColor: 'white', 
      padding: '2em', 
      maxWidth: '400px'
    },
    dialogButtons: {
      display: 'flex',
      gap: '1em',
      justifyContent: 'center',
      flexWrap: 'wrap'
    },
    dialogButton: {
      padding: '0.5em 1em',
      cursor: 'pointer'
    },
    replaceButton: {
      padding: '0.5em 1em',
      cursor: 'pointer',
      backgroundColor: '#f44336',
      color: 'white'
    },
    hiddenInput: {
      display: 'none'
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

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

          if (deck.cards.length === 0) {
            updateDeck({
              cards: deckData.cards,
              name: deckData.name,
              modified: false
            });
            setLoading(false);
          } else {
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
      if (card.id === Number(debouncedSearchTerm)) {
        return true;
      }
      return card.content.title.toUpperCase().includes(query) ||
             card.content.description.toUpperCase().includes(query) ||
             card.content.author?.toUpperCase().includes(query);
    });
  }, [deck.cards, debouncedSearchTerm]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.topRow}>
          <wired-card style={styles.loadButton} onClick={() => fileInputRef.current?.click()} elevation={2}>
            <Icon name="display" /> Load
          </wired-card>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html"
            onChange={handleFileLoad}
            style={styles.hiddenInput}
          />

          <div style={styles.centerTitle}>
            <h1 style={styles.title}>
              Deck Editor
              {deck.modified && <span style={{ color: 'orange', marginLeft: '0.5em' }}>●</span>}
            </h1>
            
            <div style={styles.viewModeToggle}>
              <wired-card 
                style={{ 
                  ...styles.viewModeButton,
                  backgroundColor: viewMode === 'full' ? '#ccc' : 'white'
                }}
                onClick={() => setViewMode('full')}
              >
                <Icon name="stop" />
              </wired-card>
              <wired-card 
                style={{ 
                  ...styles.viewModeButton,
                  backgroundColor: viewMode === 'compact' ? '#ccc' : 'white'
                }}
                onClick={() => setViewMode('compact')}
              >
                <Icon name="view_list" />
              </wired-card>
              <wired-card 
                style={{ 
                  ...styles.viewModeButton,
                  backgroundColor: viewMode === 'image' ? '#ccc' : 'white'
                }}
                onClick={() => setViewMode('image')}
              >
                <Icon name="view_module" />
              </wired-card>
            </div>
          </div>

          <wired-card 
            style={{ 
              ...styles.saveButton,
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

      <div style={styles.cardsContainer}>
        {showCardCreator ? (
          <div style={styles.fullWidthContainer}>
            <CardEditor 
              onSave={handleCardSave}
              onCancel={handleCardCancel}
            />
          </div>
        ) : filteredCards.length === 0 ? (
          <div style={styles.emptyState}>
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

      <div style={styles.bottomControls}>
        <div style={styles.actionButtons}>
          <wired-card 
            style={styles.createButton}
            onClick={() => setShowCardCreator(true)}
            elevation={2}
          >
            <Icon name="create" /> Create
          </wired-card>
        </div>

        <div style={styles.searchContainer}>
          <Icon name="search" />
          <wired-input
            id="deckEditorSearch"
            placeholder={`Search from ${deck.cards.length} cards...`}
            value={searchTerm}
            onInput={(e: any) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <div onClick={() => {
            setSearchTerm('');
            const input = document.getElementById('deckEditorSearch') as any;
            if (input) input.value = '';
          }} style={styles.clearSearch}>
            <Icon name="exit" />
          </div>
        </div>

        {loading && <div style={styles.loadingText}>Loading...</div>}
        {error && <div style={styles.errorText}>{error}</div>}

        {showLoadDialog && loadedDeckData && (
          <div style={styles.dialogOverlay}>
            <wired-card style={styles.dialogCard}>
              <h3>Load Deck</h3>
              <p>You have cards in your current deck. What would you like to do with "{loadedDeckData.name}"?</p>
              <div style={styles.dialogButtons}>
                <wired-card style={styles.dialogButton} onClick={() => setShowLoadDialog(false)}>
                  Cancel
                </wired-card>
                <wired-card style={styles.dialogButton} onClick={handleMergeDecks}>
                  Add to Current
                </wired-card>
                <wired-card style={styles.replaceButton} onClick={handleReplaceDeck}>
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
