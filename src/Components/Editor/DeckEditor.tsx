import { useState, useRef, useMemo, useEffect } from 'react';
import { Properties } from 'csstype';
import { Icon } from '../Icons';
import { CardEditor } from './CardEditor';
import { FullCardView, CompactCardView, ImageOnlyCardView } from './CardViews';
import { SelectionActions, ViewModeToggle } from './EditorControls';
import { useDeckEditor } from '../../lib/deckEditor';
import { sanitiseCard } from '../../lib/data';
import { Card } from '../../Cards';

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
  const [editingCard, setEditingCard] = useState<Card | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [loadedDeckData, setLoadedDeckData] = useState<{cards: Card[], name: string} | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'compact' | 'image'>(() => {
    const saved = localStorage.getItem('deckEditor_viewMode');
    return (saved as 'full' | 'compact' | 'image') || 'full';
  });

  const handleViewModeChange = (mode: 'full' | 'compact' | 'image') => {
    setViewMode(mode);
    localStorage.setItem('deckEditor_viewMode', mode);
  };
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());

  const handleCardSelect = (cardId: number) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedCards(new Set());
  };

  const handleHideCards = () => {
    const updatedCards = deck.cards.map(card => 
      selectedCards.has(card.id) ? { ...card, location: 'box' } : card
    );
    updateDeck({ ...deck, cards: updatedCards, modified: true });
  };

  const handleShowCards = () => {
    const updatedCards = deck.cards.map(card => 
      selectedCards.has(card.id) ? { ...card, location: 'deck' } : card
    );
    updateDeck({ ...deck, cards: updatedCards, modified: true });
  };

  const handleDeleteCards = () => {
    const updatedCards = deck.cards.filter(card => !selectedCards.has(card.id));
    updateDeck({ ...deck, cards: updatedCards, modified: true });
    clearSelection();
  };

  const handleEditCard = () => {
    const cardId = Array.from(selectedCards)[0];
    const cardToEdit = deck.cards.find(card => card.id === cardId);
    if (cardToEdit) {
      setEditingCard(cardToEdit);
      setShowCardCreator(true);
    }
  };

  const styles: { [key: string]: Properties<string | number> } = {
    container: {
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f0f0f0',
      position: 'relative'
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
      padding: '0.5em 1em'
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
    title: {
      margin: 0,
      fontSize: '1.5em'
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
      paddingBottom: '200px',
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
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      borderTop: '2px solid #ccc',
      padding: '0.5em',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1em',
      zIndex: 5
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
    clearButtonInline: {
      height: '3em',
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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (deck.modified) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [deck.modified]);

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
    if (editingCard) {
      // Update existing card
      const updatedCards = deck.cards.map(c => 
        c.id === editingCard.id ? { ...card, id: editingCard.id } : c
      );
      updateDeck({ ...deck, cards: updatedCards, modified: true });
    } else {
      // Create new card
      addCard(card);
    }
    setShowCardCreator(false);
    setEditingCard(undefined);
    clearSelection();
  };

  const handleCardCancel = () => {
    setShowCardCreator(false);
    setEditingCard(undefined);
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
          <h1 style={styles.title}>
            Deck Editor [beta]
            {deck.modified && <span style={{ color: 'orange', marginLeft: '0.5em' }}>●</span>}
          </h1>
          
          <ViewModeToggle 
            viewMode={viewMode} 
            onViewModeChange={handleViewModeChange} 
          />
        </div>
      </div>

      <div style={styles.cardsContainer}>
        {filteredCards.length === 0 ? (
          <div style={styles.emptyState}>
            {debouncedSearchTerm ? 'No cards match your search.' : 'No cards in deck. Create a new card or load an existing deck.'}
          </div>
        ) : (
          filteredCards.map(card => {
            if (viewMode === 'full') {
              return <FullCardView 
                key={card.id} 
                card={card} 
                isSelected={selectedCards.has(card.id)}
                onCardSelect={handleCardSelect}
              />;
            } else if (viewMode === 'compact') {
              return <CompactCardView 
                key={card.id} 
                card={card}
                isSelected={selectedCards.has(card.id)}
                onCardSelect={handleCardSelect}
              />;
            } else {
              return <ImageOnlyCardView 
                key={card.id} 
                card={card}
                isSelected={selectedCards.has(card.id)}
                onCardSelect={handleCardSelect}
              />;
            }
          })
        )}
      </div>

      <div style={styles.bottomControls}>
        <div style={styles.actionButtons}>
          {selectedCards.size > 0 ? (
            <>
              <SelectionActions
                selectedCards={selectedCards}
                deck={deck}
                onEdit={handleEditCard}
                onHide={handleHideCards}
                onShow={handleShowCards}
                onDelete={handleDeleteCards}
              />
              <wired-card style={styles.clearButtonInline} onClick={clearSelection} elevation={2}>
                <Icon name="exit" /> Clear ({selectedCards.size})
              </wired-card>
            </>
          ) : (
            <wired-card 
              style={styles.createButton}
              onClick={() => setShowCardCreator(true)}
              elevation={2}
            >
              <Icon name="create" /> Create
            </wired-card>
          )}
          
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

        {showCardCreator && (
          <CardEditor 
            onSave={handleCardSave}
            onCancel={handleCardCancel}
            editingCard={editingCard}
          />
        )}
      </div>
    </div>
  );
}
