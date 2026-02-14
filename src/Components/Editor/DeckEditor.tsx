import { useState, useRef, useMemo, useEffect } from 'react';
import { Properties } from 'csstype';
import { Icon } from '../Icons';
import { CardEditor } from './CardEditor';
import { FullCardView, CompactCardView, ImageOnlyCardView } from './CardViews';
import { ViewModeToggle } from './EditorControls';
//@ts-expect-error: JS Module
import { undo, sketchpad, strokes } from '../../Canvas.js';

function DrawingControls({ onBack, onUndo }: { 
  onBack: () => void,
  onUndo: () => void 
}) {
  const styles = {
    container: {
      position: 'fixed' as const,
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10,
      display: 'flex',
      gap: '1em'
    },
    button: {
      cursor: 'pointer',
      width: '3em',
      height: '3em',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column' as const,
      backgroundColor: 'white',
      borderRadius: '8px'
    }
  };

  return (
    <div style={styles.container}>
      <wired-card elevation={2} style={styles.button} onClick={onUndo}>
        <Icon name="undo" />
        Undo
      </wired-card>
      <wired-card elevation={2} style={styles.button} onClick={onBack}>
        <Icon name="done" />
        Done
      </wired-card>
    </div>
  );
}
import { useDeckEditor } from '../../lib/editor';
import { sanitiseCard, downloadDeck } from '../../lib/data';
import { Card } from '../../Cards';

export function DeckEditor() {
  const {
    deck,
    addCard,
    updateDeck
  } = useDeckEditor();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCardCreator, setShowCardCreator] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | undefined>(undefined);
  const [modalState, setModalState] = useState<'closed' | 'file' | 'reset' | 'save' | 'loadConfirm'>('closed');
  const [showDrawingControls, setShowDrawingControls] = useState(false);
  const [drawingHandlers, setDrawingHandlers] = useState<{ onBack: () => void, onUndo: () => void }>({
    onBack: () => {},
    onUndo: () => {}
  });
  const [saveFileName, setSaveFileName] = useState('');
  const [merging, setMerging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
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
      width: '100vw',
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
      width: '4em',
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
      fontSize: '1.5em',
      cursor: 'pointer',
      userSelect: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5em'
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
      width: '4em',
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
      width: '4em',
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
    fileModalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    fileModal: {
      backgroundColor: 'white',
      borderRadius: '1em',
      padding: '1em',
      maxWidth: '300px',
      width: '80vw',
      textAlign: 'center'
    },
    modalTitle: {
      margin: 0
    },
    fileModalButtons: {
      display: 'flex',
      gap: '1em',
      justifyContent: 'center',
      marginTop: '1em'
    },
    selectionButton: {
      height: '3em',
      width: '4em',
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
    clearButtonInline: {
      height: '3em',
      width: '4em',
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
            setModalState('closed');
            setLoading(false);
          } else {
            setLoadedDeckData(deckData);
            setModalState('loadConfirm');
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
    if (!loadedDeckData) return;
    
    updateDeck({
      cards: loadedDeckData.cards,
      name: loadedDeckData.name,
      modified: false
    });
    
    setModalState('closed');
    setLoadedDeckData(null);
  };

  const handleMergeDecks = () => {
    if (!loadedDeckData || merging) return;
    
    setMerging(true);
    const maxId = Math.max(...deck.cards.map(c => c.id), 0);
    const mergedCards = loadedDeckData.cards.map((card, index) => ({
      ...card,
      id: maxId + index + 1
    }));
    
    updateDeck({
      ...deck,
      cards: [...deck.cards, ...mergedCards],
      modified: true
    });
    
    setModalState('closed');
    setLoadedDeckData(null);
    setMerging(false);
  };

  const handleCardSave = (card: Omit<Card, 'id'>) => {
    if (editingCard) {
      const updatedCards = deck.cards.map(c => 
        c.id === editingCard.id ? { ...card, id: editingCard.id } : c
      );
      updateDeck({ ...deck, cards: updatedCards, modified: true });
    } else {
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

  const handleShowDrawingControls = (show: boolean, handlers: { onBack: () => void, onUndo: () => void }) => {
    setShowDrawingControls(show);
    setDrawingHandlers(handlers);
  };

  const handleClearDeck = () => {
    updateDeck({
      cards: [],
      name: 'New Deck',
      modified: false
    });
    setModalState('closed');
    clearSelection();
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
          <h1 style={styles.title} onClick={() => setModalState('file')}>
            <Icon name="menu" /> Deck Editor
            {deck.modified && <span style={{ color: 'orange' }}>●</span>}
          </h1>
          
          <ViewModeToggle 
            viewMode={viewMode} 
            onViewModeChange={handleViewModeChange} 
          />
        </div>
      </div>

      {showDrawingControls && (
        <DrawingControls 
          onBack={drawingHandlers.onBack}
          onUndo={drawingHandlers.onUndo}
        />
      )}

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
          {selectedCards.size === 1 ? (
            Array.from(selectedCards).every(id => 
              deck.cards.find((card: Card) => card.id === id)?.location === 'box'
            ) ? (
              <wired-card 
                style={{...styles.selectionButton, color: 'red'}} 
                onClick={handleDeleteCards} 
                elevation={2}
              >
                <Icon name="discard" /> Delete
              </wired-card>
            ) : (
              <wired-card style={styles.selectionButton} onClick={handleEditCard} elevation={2}>
                <Icon name="create" /> Edit
              </wired-card>
            )
          ) : selectedCards.size > 0 ? (
            Array.from(selectedCards).every(id => 
              deck.cards.find((card: Card) => card.id === id)?.location === 'box'
            ) ? (
              <wired-card 
                style={{...styles.selectionButton, color: 'red'}} 
                onClick={handleDeleteCards} 
                elevation={2}
              >
                <Icon name="discard" /> Delete
              </wired-card>
            ) : Array.from(selectedCards).some(id => 
              deck.cards.find((card: Card) => card.id === id)?.location === 'box'
            ) ? (
              <wired-card 
                style={{
                  ...styles.selectionButton,
                  opacity: 0.5,
                  cursor: 'not-allowed',
                  color: 'red'
                }}
                elevation={2}
              >
                <Icon name="discard" /> Delete
              </wired-card>
            ) : (
              <wired-card 
                style={{
                  ...styles.selectionButton,
                  opacity: 0.5,
                  cursor: 'not-allowed'
                }}
                elevation={2}
              >
                <Icon name="create" /> Edit
              </wired-card>
            )
          ) : (
            <wired-card 
              style={styles.createButton}
              onClick={() => setShowCardCreator(true)}
              elevation={2}
            >
              <Icon name="create" /> Create
            </wired-card>
          )}

          <wired-card 
            style={{
              ...styles.selectionButton,
              opacity: selectedCards.size > 0 ? 1 : 0.5,
              cursor: selectedCards.size > 0 ? 'pointer' : 'not-allowed'
            }}
            onClick={selectedCards.size > 0 ? (Array.from(selectedCards).every(id => 
              deck.cards.find((card: Card) => card.id === id)?.location === 'box'
            ) ? handleShowCards : handleHideCards) : undefined} 
            elevation={2}
          >
            <Icon name={selectedCards.size > 0 && Array.from(selectedCards).every(id => 
              deck.cards.find((card: Card) => card.id === id)?.location === 'box'
            ) ? "show" : "hide"} /> {selectedCards.size > 0 && Array.from(selectedCards).every(id => 
              deck.cards.find((card: Card) => card.id === id)?.location === 'box'
            ) ? 'Show' : 'Hide'}
          </wired-card>
          
          <wired-card 
            style={{
              ...styles.clearButtonInline,
              opacity: selectedCards.size > 0 ? 1 : 0.5,
              cursor: selectedCards.size > 0 ? 'pointer' : 'not-allowed'
            }}
            onClick={selectedCards.size > 0 ? clearSelection : undefined} 
            elevation={2}
          >
            <Icon name="exit" /> Clear {selectedCards.size > 0 ? `(${selectedCards.size})` : ''}
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

        {showCardCreator && (
          <CardEditor 
            onSave={handleCardSave}
            onCancel={handleCardCancel}
            editingCard={editingCard}
            onShowDrawingControls={handleShowDrawingControls}
          />
        )}

        {modalState !== 'closed' && (
          <div style={styles.fileModalOverlay} onClick={(e) => e.target === e.currentTarget && setModalState('closed')}>
            <wired-card style={styles.fileModal} elevation={3}>
              {modalState === 'reset' ? (
                <>
                  <h3 style={styles.modalTitle}>Reset Deck</h3>
                  <p>Are you sure you want to reset the deck? This will delete all cards and cannot be undone.</p>
                  <div style={styles.fileModalButtons}>
                    <wired-card 
                      style={styles.saveButton} 
                      onClick={() => setModalState('closed')} 
                      elevation={2}
                    >
                      <Icon name="exit" /> Cancel
                    </wired-card>
                    <wired-card 
                      style={{
                        ...styles.saveButton,
                        color: '#f44336'
                      }}
                      onClick={() => {
                        handleClearDeck();
                      }}
                      elevation={2}
                    >
                      <Icon name="discard" /> Reset
                    </wired-card>
                  </div>
                </>
              ) : modalState === 'save' ? (
                <>
                  <h3 style={styles.modalTitle}>Save Deck</h3>
                  <p>Enter a name for your deck:</p>
                  <wired-input
                    value={saveFileName}
                    onInput={(e: any) => setSaveFileName(e.target.value)}
                    style={{ width: '80%', marginBottom: '1em' }}
                  />
                  <div style={styles.fileModalButtons}>
                    <wired-card 
                      style={styles.saveButton} 
                      onClick={() => setModalState('closed')} 
                      elevation={2}
                    >
                      <Icon name="exit" /> Cancel
                    </wired-card>
                    <wired-card 
                      style={styles.saveButton}
                      onClick={() => {
                        updateDeck({ ...deck, name: saveFileName, modified: false });
                downloadDeck(deck.cards, saveFileName);
                        setModalState('closed');
                      }}
                      elevation={2}
                    >
                      <Icon name="take" /> Save
                    </wired-card>
                  </div>
                </>
              ) : modalState === 'loadConfirm' ? (
                <>
                  <h3 style={styles.modalTitle}>Load Deck</h3>
                  <p>You have cards in your current deck. What would you like to do with "{loadedDeckData?.name}"?</p>
                  <div style={styles.fileModalButtons}>
                    <wired-card 
                      style={styles.saveButton} 
                      onClick={() => setModalState('closed')} 
                      elevation={2}
                    >
                      <Icon name="exit" /> Cancel
                    </wired-card>
                    <wired-card 
                      style={styles.saveButton}
                      onClick={handleMergeDecks}
                      elevation={2}
                    >
                      <Icon name="copy" /> Merge
                    </wired-card>
                    <wired-card 
                      style={{
                        ...styles.saveButton,
                        color: '#f44336'
                      }}
                      onClick={handleReplaceDeck}
                      elevation={2}
                    >
                      <Icon name="shuffle" /> Replace
                    </wired-card>
                  </div>
                </>
              ) : (
                <>
                  <h3 style={styles.modalTitle}>Welcome to the Deck Editor</h3>
                  <p>Load in Decks from your saved files, edit cards, and Save your deck, or Reset to start fresh</p>
                  <div style={styles.fileModalButtons}>
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
                      onClick={deck.cards.length === 0 ? undefined : () => {
                        setSaveFileName(deck.name || 'My Deck');
                        setModalState('save');
                      }}
                      elevation={2}
                    >
                      <Icon name="take" /> Save
                    </wired-card>

                    <wired-card 
                      style={{
                        ...styles.saveButton,
                        color: '#f44336'
                      }}
                      onClick={() => {
                        setModalState('reset');
                      }}
                      elevation={2}
                    >
                      <Icon name="discard" /> Reset
                    </wired-card>
                  </div>
                </>
              )}
            </wired-card>
          </div>
        )}
      </div>
    </div>
  );
}
