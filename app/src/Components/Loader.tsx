import type { Properties } from "csstype";
import { externalLink, useWindowDimensions } from "../lib/hooks";
import { sanitiseCard } from "../lib/data";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Card, Rule, getCardsByLocation } from "@mcteamster/white-core";
import { Icon } from "./Icons";
import type { BoardProps } from "@mcteamster/white-engine/react";
import type { GameState } from "@mcteamster/white-core";
import { submitGlobalCard } from "../lib/clients";
import { BLANK_IMAGE, compressImage, decompressImage, resizeImage } from "../lib/images";
import { ImageCacheType } from "../lib/contexts";
import { usePlayerData } from "../lib/hooks";

async function decodeRestoreImage(image: string) {
  if (image.startsWith('data:image/png;base64,')) return image;
  try {
    return await decompressImage(image);
  } catch {
    return BLANK_IMAGE;
  }
}

const previewStyles: Record<string, Properties<string | number>> = {
  previewItem: {
    width: '15em',
    borderRadius: '0.25em',
    margin: '0.25em',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexGrow: 1,
  },
  previewImage: {
    margin: '0.25em 0.5em',
    width: '2em',
    height: '2em',
    border: '0.1pt solid black',
    backgroundColor: 'white',
  },
};

function LoaderPreviewCard({ selected, label, image, imageHidden, title, ...rowProps }: {
  selected: boolean;
  label: React.ReactNode;
  image?: { src?: string; alt?: string };
  imageHidden?: boolean;
  title?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rowProps} style={{
      ...previewStyles.previewItem,
      minHeight: '2.5em',
      color: selected ? 'black' : 'grey',
      backgroundColor: selected ? '#eee' : 'white',
      ...rowProps.style,
    }}>
      {label}
      {imageHidden ? (
        <span aria-hidden="true" style={{
          ...previewStyles.previewImage,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}>
          <Icon name='hide' />
        </span>
      ) : image && <img style={previewStyles.previewImage} src={image.src} alt={image.alt} />}
      {title}
    </div>
  );
}

interface LoaderProps extends BoardProps<GameState> {
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
}

export function Loader({ G, moves, isMultiplayer, mode, playerID, plugins, setMode }: LoaderProps) {
  const { width, height } = useWindowDimensions();
  const [globalSubmit, setGlobalSubmit] = useState(false); // Global Submission Mode - Only one card can be uploaded
  const [loaded, setLoaded] = useState([] as Card[]); // List of cards staged for submitting
  const [loadedRules, setLoadedRules] = useState<Omit<Rule, 'playerID' | 'playerName'>[]>([]); // Rules parsed from deck file
  const [progress, setProgress] = useState([-1, 0]); // Progress index of currently processing load: [currentIndex, endIndex]. -1 means no processing
  const [compressImages, setCompressImages] = useState(true); // Whether to compress PNG images on load
  const [restoreView, setRestoreView] = useState(false);
  const [selectedBoxCardIDs, setSelectedBoxCardIDs] = useState<Set<number>>(() => new Set());
  const [hideBoxTitles, setHideBoxTitles] = useState(true);
  const [hideBoxImages, setHideBoxImages] = useState(true);
  const [restoreImages, setRestoreImages] = useState<Record<number, string>>({});
  const boxCards = useMemo(() => getCardsByLocation(G.cards, 'box'), [G.cards]);
  const selectedBoxCards = useMemo(() => boxCards.filter((card) => selectedBoxCardIDs.has(card.id)), [boxCards, selectedBoxCardIDs]);
  const { hostPlayerID } = usePlayerData(plugins);
  const canRestore = isMultiplayer && playerID != null && playerID === hostPlayerID;
  const showRestoreView = canRestore && restoreView;
  const restoreSelectedCards = useCallback((target: 'hand' | 'deck') => {
    if (!canRestore || selectedBoxCards.length === 0) return;
    selectedBoxCards.forEach((card) => moves.moveCard(card.id, target));
    const movedIDs = new Set(selectedBoxCards.map((card) => card.id));
    setSelectedBoxCardIDs((current) => new Set([...current].filter((id) => !movedIDs.has(id))));
  }, [canRestore, moves, selectedBoxCards]);
  const isCustomServer = !!localStorage.getItem('customServerUrl');
  const fileSelector = document.getElementById('fileselector') as HTMLInputElement;

  useEffect(() => {
    if (!canRestore || mode !== 'menu-tools-loader') {
      setRestoreView(false);
      setSelectedBoxCardIDs(new Set());
      setHideBoxTitles(true);
      setHideBoxImages(true);
    }
  }, [canRestore, mode]);

  useEffect(() => {
    const boxedIDs = new Set(boxCards.map((card) => card.id));
    setSelectedBoxCardIDs((current) => {
      const retained = [...current].filter((id) => boxedIDs.has(id));
      return retained.length === current.size ? current : new Set(retained);
    });
  }, [boxCards]);

  useEffect(() => {
    if (!showRestoreView || hideBoxImages) return;
    let cancelled = false;
    Promise.all(boxCards.map(async (card) => [
      card.id,
      card.content.image ? await decodeRestoreImage(card.content.image) : BLANK_IMAGE,
    ] as const)).then((images) => {
      if (!cancelled) setRestoreImages(Object.fromEntries(images));
    }).catch((error) => console.error('Unable to load hidden card images', error));
    return () => { cancelled = true; };
  }, [boxCards, hideBoxImages, showRestoreView]);

  // Cache All Images from Imported Deck
  const [imageCache, dispatchImage] = useReducer((cache: ImageCacheType, image: { id: number, value: string }) => {
    cache[image.id] = image.value;
    return cache
  }, {})

  // Leave and clear
  const leaveLoader = useCallback(() => {
    fileSelector.value = '';
    setMode('play');
  }, [fileSelector, setMode])

  // Handle File Upload
  const uploadDeck = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadWarning = () => {
      const fileLoadButton = document.getElementById('fileLoadButton');
      if (!fileLoadButton) return;
      fileLoadButton.style.color = 'red';
      setTimeout(() => {
        fileLoadButton.style.color = 'black';
        fileSelector.value = '';
      }, 500)
    }

    let deckFile: File | undefined;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (event.target && event.target.result) {
          const result = event.target.result as string;
          let cards;
          let parsedRules: Omit<Rule, 'playerID' | 'playerName'>[] = [];
          if (deckFile?.name?.endsWith('.json')) {
            // JSON Deck Format: { cards: Card[], rules?: Rule[] }
            const parsed = JSON.parse(result);
            cards = parsed.cards ?? [];
            if (Array.isArray(parsed.rules)) {
              parsedRules = parsed.rules;
            }
          } else {
            const dataLine = result.split("\n")[1]; // Read 2nd Line
            try {
              // v2 Deck Data Format
              const trimmedData = dataLine.trim() // Remove excess whitespace
              const base64Data = trimmedData.substring(1, trimmedData.length - 2); // Remove excess whitespace, trailing semicolon, and quotes
              const decodedData = atob(base64Data); // Base 64 decode
              const jsonData = decodeURI(decodedData); // URI decode
              const parsed = JSON.parse(jsonData); // JSON parse
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.cards) {
                cards = parsed.cards;
                if (Array.isArray(parsed.rules)) {
                  parsedRules = parsed.rules;
                }
              } else {
                cards = parsed; // legacy bare array
              }
            } catch (err) {
              console.error(err);
              // v1 Deck Data Format
              cards = JSON.parse(dataLine.substring(0, dataLine.length - 1)); // Remove Trailing Semicolon and parse
            }
          }
          setLoadedRules(parsedRules);
          // @ts-expect-error Legacy Card Input Compatibiity
          const deck = cards.map((card) => {
            const sanitisedCard = sanitiseCard(card);
            if (globalSubmit) {
              sanitisedCard.location = 'box'; // Start with all cards deselected when uploading to global
            }
            return sanitisedCard;
          });

          // Process images for preview
          // Note: forEach with async callbacks fires concurrently (not sequentially awaited).
          // compressImages is captured from the closure at callback creation time, which is
          // safe here because uploadDeck is re-created when compressImages changes (see dep array).
          deck.forEach(async (card: Card, i: number, arr: Card[]) => {
            if (card.content.image && card.content.image?.startsWith('data:image/png;base64,')) {
              dispatchImage({ id: i, value: card.content.image }) // Cache the Uncompressed Image
              if (compressImages) {
                card.content.image = await compressImage(await resizeImage(card.content.image)); // Import Compressed image
              }
            } else if (card.content.image) {
              // Cache the Decompressed Image
              decompressImage(card.content.image).then(res => {
                dispatchImage({ id: i, value: res });
              });
            } else {
              dispatchImage({ id: i, value: BLANK_IMAGE });
            }

            // Update Loaded at the end
            if (arr.length > 0 && (i == arr.length - 1)) {
              setProgress([-1, arr.length])
              setTimeout(() => {
                setLoaded([...arr]);
              }, 500)
            }
          })
        }
      } catch (err) {
        uploadWarning();
        console.error(err);
        setLoaded([]);
        setProgress([-1, 0])
      }
    }

    try {
      if (e.target.files) {
        deckFile = e.target.files[0];
        reader.readAsText(deckFile);
      }
    } catch (err) {
      uploadWarning();
      console.error(err);
      setLoaded([]);
      setProgress([-1, 0])
    }
  }, [compressImages, fileSelector, globalSubmit])

  // Batch Submissions
  useEffect(() => {
    // In Progress
    if (progress[0] >= 0 && progress[0] < progress[1]) {
      const bounds = [ progress[0], Math.min((progress[0] + 25), progress[1]) ] // 25 cards per second
      const cards = loaded.slice(...bounds);
      if (cards.length == 0) {
        // Skip immediately
        setTimeout(() => {
          setProgress([bounds[1], progress[1]]); // Start next batch
        }, 0)
      } else {
        const createdCards: Card[] = cards.map((card) => { 
          return {
            id: 0, // ID Assignment handled by the loadCards move
            content: card.content,
            location: card.location || 'deck',
            likes: card?.likes ?? undefined,
            timestamp: Number(new Date()),
          }
        });
        moves.loadCards(createdCards, progress[0] === 0 && loadedRules.length > 0 ? loadedRules : undefined);
        if (progress[0] === 0 && loadedRules.length > 0) setLoadedRules([]); // Rules sent with first batch only
        // Wait a moment before submitting again
        setTimeout(() => {
          setProgress([bounds[1], progress[1]]); // Start next batch
        }, 1000);
      }
    } else if (progress[0] >= progress[1]) {
      // Finish processing
      setTimeout(() => {
        setLoaded([]); // Clear buffer
        setProgress([-1, 0]); // Stop processing, reset tracker
        leaveLoader();
      }, 0)
    }
  }, [progress, setProgress, moves, setMode, loaded, leaveLoader])

  // Render
  const [ displayLoader, setDisplayLoader] = useState(<></>);
  useEffect(() => {
    const styles: { [key: string]: Properties<string | number> } = {
      loader: {
        width: width * 0.75,
        height: height * 0.75,
        padding: '1em',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      title: {
        fontSize: '2em',
      },
      info: {
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      listbutton: {
        padding: '0.5em',
      },
      preview: {
        width: '100%',
        minWidth: '10em',
        margin: '0',
        maxHeight: '35vh',
        overflowY: 'scroll',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      },
      previewNumber: {
        width: '1.5em',
        textAlign: 'right',
      },
      prompt: {
        textAlign: 'center',
      },
      instructionsContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      },
      instructions: {
        width: '15em',
        margin: '0.5em',
        textAlign: 'center',
        backgroundColor: '#eee',
      },
      uploader: {
        display: 'none',
      },
      confirmation: {
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
      button: {
        height: '3em',
        width: '6em',
        margin: '0.25em',
        fontWeight: 'bold',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eee',
        borderRadius: '1em',
      },
      compressionOption: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25em',
        marginTop: '0.5em',
      },
      compressionToggle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5em',
        cursor: 'pointer',
      },
      checkbox: {
        height: '1em',
        width: '1em',
        fontWeight: 'bold',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eee',
        borderRadius: '1em',
      },
      compressionWarning: {
        color: 'red',
      },
      restoreView: {
        width: '100%',
        minHeight: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5em',
      },
      restoreFilters: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1em',
      },
      restoreFilter: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4em',
        cursor: 'pointer',
      },
      restoreExportNote: {
        maxWidth: '32em',
        color: '#555',
        fontSize: '0.85em',
        textAlign: 'center',
      },
      restoreEmpty: {
        color: 'grey',
        fontStyle: 'italic',
      },
    }

      // Submit loaded cards to server
    const submitLoaded = () => {
      setProgress([0, progress[1]]); // Begin submitting from the start
    }

    setDisplayLoader(
      <wired-dialog open={mode == 'menu-tools-loader' ? true : undefined} onClick={(e) => { setMode('menu-tools'); e.stopPropagation() }}>
        <div style={styles.loader} onClick={(e) => e.stopPropagation()}>
          <div style={styles.title}>
            {showRestoreView ? 'Restore Hidden Cards' : 'Deck Loader'}
          </div>
          {showRestoreView ? (
            <div style={styles.restoreView}>
              <div style={styles.restoreFilters}>
                <div
                  role='checkbox'
                  aria-checked={hideBoxImages}
                  tabIndex={0}
                  style={styles.restoreFilter}
                  onClick={() => setHideBoxImages((hidden) => !hidden)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setHideBoxImages((hidden) => !hidden);
                    }
                  }}
                >
                  <span>Hide Images</span>
                  <wired-card style={styles.checkbox}>{hideBoxImages && <Icon name='exit' />}</wired-card>
                </div>
                <div
                  role='checkbox'
                  aria-checked={hideBoxTitles}
                  tabIndex={0}
                  style={styles.restoreFilter}
                  onClick={() => setHideBoxTitles((hidden) => !hidden)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setHideBoxTitles((hidden) => !hidden);
                    }
                  }}
                >
                  <span>Hide Titles</span>
                  <wired-card style={styles.checkbox}>{hideBoxTitles && <Icon name='exit' />}</wired-card>
                </div>
              </div>
              <wired-card style={{ width: '100%', minWidth: 0 }}>
              <div style={{ ...styles.preview, overflowY: 'auto' }}>
                {boxCards.length === 0
                  ? <div style={styles.restoreEmpty}>No hidden cards to restore.</div>
                  : boxCards.map((card) => (
                    <LoaderPreviewCard
                      key={card.id}
                      role='checkbox'
                      aria-checked={selectedBoxCardIDs.has(card.id) ? 'true' : 'false'}
                      aria-label={`ID ${card.id}`}
                      tabIndex={0}
                      selected={selectedBoxCardIDs.has(card.id)}
                      style={{ cursor: 'pointer' }}
                      label={<span style={{ paddingInline: '0.5em', flexShrink: 0 }}>{card.id}</span>}
                      title={hideBoxTitles ? '*'.repeat(Array.from(card.content.title).length) : card.content.title || 'Untitled'}
                      imageHidden={hideBoxImages}
                      image={!hideBoxImages ? { src: restoreImages[card.id] || BLANK_IMAGE, alt: `Card ${card.id}` } : undefined}
                      onClick={() => setSelectedBoxCardIDs((current) => {
                        const next = new Set(current);
                        if (next.has(card.id)) next.delete(card.id);
                        else next.add(card.id);
                        return next;
                      })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedBoxCardIDs((current) => {
                            const next = new Set(current);
                            if (next.has(card.id)) next.delete(card.id);
                            else next.add(card.id);
                            return next;
                          });
                        }
                      }}
                    />
                  ))
                }
              </div>
              </wired-card>
              <div style={styles.restoreExportNote}>
                Restored cards will appear as visible cards in later exports.
              </div>
              <div style={styles.confirmation}>
                <wired-card style={styles.button} onClick={() => {
                  setSelectedBoxCardIDs(new Set());
                  setHideBoxTitles(true);
                  setHideBoxImages(true);
                  setRestoreView(false);
                }}>
                  <Icon name='back' />Back
                </wired-card>
                <wired-card
                  role='button'
                  aria-disabled={selectedBoxCards.length === 0 ? 'true' : 'false'}
                  tabIndex={selectedBoxCards.length === 0 ? -1 : 0}
                  style={{ ...styles.button, color: selectedBoxCards.length > 0 ? 'black' : 'grey' }}
                  onClick={() => restoreSelectedCards('hand')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      restoreSelectedCards('hand');
                    }
                  }}
                >
                  <Icon name='hand' />To Hand
                </wired-card>
                <wired-card
                  role='button'
                  aria-disabled={selectedBoxCards.length === 0 ? 'true' : 'false'}
                  tabIndex={selectedBoxCards.length === 0 ? -1 : 0}
                  style={{ ...styles.button, color: selectedBoxCards.length > 0 ? 'black' : 'grey' }}
                  onClick={() => restoreSelectedCards('deck')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      restoreSelectedCards('deck');
                    }
                  }}
                >
                  <Icon name='shuffle' />To Deck
                </wired-card>
              </div>
            </div>
          ) : <>
          <div>
          {
            loaded.length > 0 ?
              <wired-card>
                <div style={styles.info}>
                  <div style={{...styles.listbutton, color: globalSubmit ? 'grey' : 'black'}} onClick={() => { if (!globalSubmit) setLoaded(loaded.map((card) => { card.location = 'deck'; return card })); }}>
                    <Icon name='checklist' />
                  </div>
                  {
                    (progress[0] == -1) ?
                    <div style={{ color: (globalSubmit && (getCardsByLocation(loaded, 'deck').length != 1)) ? 'red' : 'black' }}>
                      {`${getCardsByLocation(loaded, 'deck').length} / ${loaded.length}`}
                    </div> :
                    <div>
                      {`${((progress[0]/progress[1])*100).toFixed(0)}% Complete`}
                    </div>
                  }
                  <div style={{...styles.listbutton, color: globalSubmit ? 'grey' : 'black'}} onClick={() => { if (!globalSubmit) setLoaded(loaded.map((card) => { card.location = 'box'; return card })); }}>
                    <Icon name='exit' />
                  </div>
                </div>
                <div style={styles.preview}>
                  {loaded.length > 0 && loaded.map((card: Card, i) => {
                    return (<LoaderPreviewCard key={`loader-preview-${i}`}
                      selected={card.location !== 'box'}
                      label={<div style={styles.previewNumber}>
                        {card.location == 'deck' && (i < progress[0]) && '*'}{i + 1}
                      </div>}
                      image={{ src: imageCache[i], alt: '' }}
                      title={card.content.title} onClick={() => {
                      if (progress[0] == -1) {
                        if (globalSubmit) {
                          // In global submit mode: deselect all others, then toggle this one
                          loaded.forEach((c, idx) => {
                            if (idx === i) {
                              c.location = (c.location == 'deck') ? 'box' : 'deck';
                            } else {
                              c.location = 'box';
                            }
                          });
                          setLoaded([...loaded]);
                        } else {
                          // Normal mode: just toggle
                          loaded[i].location = (card.location == 'deck') ? 'box' : 'deck';
                          setLoaded([...loaded]);
                        }
                      }}} />)
                  })}
                </div>
                {globalSubmit ? (
                  <div style={styles.prompt}>
                    Limited to ONE card per submission
                  </div>
                ) : (
                  <div style={styles.prompt}>
                    Tap cards to include/exclude
                  </div>
                )}
              </wired-card> :
              <div style={styles.instructionsContainer} >
                {
                  !isMultiplayer ?
                  <>
                    <wired-card id="fileLoadButton" style={{...styles.instructions }} onClick={() => { setGlobalSubmit(true); document.getElementById('fileselector')?.click() }}>
                      <Icon name='global' />
                      Submit a card to the Global Deck
                    </wired-card>
                    <wired-card style={{...styles.instructions }} onClick={() => { externalLink('https://blankwhite.cards/editor') }}>
                      <Icon name='create' />
                      Open Deck Editor
                    </wired-card>
                  </> :
                  <>
                    <wired-card id="fileLoadButton" style={{...styles.instructions }} onClick={() => { setGlobalSubmit(false); document.getElementById('fileselector')?.click() }}>
                      <Icon name='load' />
                      Load cards into this session
                    </wired-card>
                    {canRestore && boxCards.length > 0 && (
                      <wired-card
                        style={{...styles.instructions}}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedBoxCardIDs(new Set());
                          setHideBoxTitles(true);
                          setHideBoxImages(true);
                          setRestoreView(true);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedBoxCardIDs(new Set());
                            setHideBoxTitles(true);
                            setHideBoxImages(true);
                            setRestoreView(true);
                          }
                        }}
                      >
                        <Icon name='show' />
                        Restore Hidden Cards
                      </wired-card>
                    )}
                    <wired-card style={{...styles.instructions }} onClick={() => { externalLink('https://blankwhite.cards/editor') }}>
                      <Icon name='create' />
                      Open Deck Editor
                    </wired-card>
                  </>
                }
                {isCustomServer && isMultiplayer && (
                  <div style={styles.compressionOption}>
                    <div
                      role="checkbox"
                      aria-checked={compressImages}
                      tabIndex={0}
                      style={styles.compressionToggle}
                      onClick={() => setCompressImages(!compressImages)}
                      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setCompressImages(!compressImages) } }}
                    >
                      <span>Compress images</span>
                      <wired-card style={styles.checkbox}>
                        {compressImages && <Icon name="done" />}
                      </wired-card>
                    </div>
                    {!compressImages && (
                      <span id="uploadWarning" style={styles.compressionWarning}>Not recommended for decks larger than 100 cards</span>
                    )}
                  </div>
                )}
              </div>
          } 
          </div>
          <input disabled={progress[0] != -1} style={styles.uploader} type="file" id="fileselector" accept=".html,.htm,.json" onChange={uploadDeck} />
          <div style={styles.confirmation}>
            <wired-card style={styles.button} onClick={() => { setMode('play') }}>
              <Icon name='exit' />Close
            </wired-card>
            <wired-card style={{ ...styles.button, color: (loaded.length > 0) ? 'red' : 'grey' }} onClick={() => { if (loaded.length > 0) { setLoaded([]); leaveLoader() } }}>
              <Icon name='discard' />{(progress[0] == -1) ? 'Cancel' : 'Stop'}
            </wired-card>
            <wired-card style={{ 
                ...styles.button, 
                color: ((globalSubmit && !isMultiplayer && getCardsByLocation(loaded, 'deck').length == 1)) ? undefined : (!globalSubmit &&(progress[0] == -1) && (getCardsByLocation(loaded, 'deck').length > 0)) ? undefined : 'grey',
              }} 
              onClick={() => {
              if (progress[0] == -1 && getCardsByLocation(loaded, 'deck').length > 0) {
                if (globalSubmit) {
                  if (!isMultiplayer && getCardsByLocation(loaded, 'deck').length == 1) {
                    submitGlobalCard(getCardsByLocation(loaded, 'deck')[0]); // Only one card can be submitted to the global deck at a time
                    submitLoaded(); // Also upload straight to gamestate
                  }
                } else {
                  submitLoaded();
                }
              }}}>
              <Icon name='done' />{(progress[0] == -1) ? 'Upload' : 'Uploading'}
            </wired-card>
          </div>
          </>}
        </div>
      </wired-dialog>
    )
  }, [boxCards, canRestore, compressImages, globalSubmit, height, imageCache, isMultiplayer, leaveLoader, loaded, mode, moves, progress, restoreImages, restoreSelectedCards, showRestoreView, selectedBoxCardIDs, selectedBoxCards, setMode, hideBoxImages, hideBoxTitles, uploadDeck, width])

  return (displayLoader)
}
