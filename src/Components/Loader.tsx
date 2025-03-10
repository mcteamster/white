import { Properties } from "csstype";
import { useWindowDimensions } from "../lib/hooks";
import { sanitiseCard } from "../lib/data";
import { useCallback, useEffect, useReducer, useState } from "react";
import { Card, getCardsByLocation } from "../Cards";
import { Icon } from "./Icons";
import { BoardProps } from "boardgame.io/dist/types/packages/react";
import { GameState } from "../Game";
import { submitGlobalCard } from "../lib/clients";
import { BLANK_IMAGE, compressImage, decompressImage, resizeImage } from "../lib/images";
import { ImageCacheType } from "../lib/contexts";

interface LoaderProps extends BoardProps<GameState> {
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
}

export function Loader({ moves, isMultiplayer, mode, setMode }: LoaderProps) {
  const { width, height } = useWindowDimensions();
  const [globalSubmit, setGlobalSubmit] = useState(false); // Global Submission Mode - Only one card can be uploaded
  const [loaded, setLoaded] = useState([] as Card[]); // List of cards staged for submitting
  const [progress, setProgress] = useState([-1, 0]); // Progress index of currently processing load: [currentIndex, endIndex]. -1 means no processing
  const fileSelector = document.getElementById('fileselector') as HTMLInputElement;

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
      const fileCard = document.getElementById('fileCard') as HTMLElement;
      fileCard.style.color = 'red';
      setTimeout(() => {
        fileCard.style.color = 'black';
        fileSelector.value = '';
      }, 500)
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (event.target && event.target.result) {
          const result = event.target.result as string;
          const dataLine = result.split("\n")[1]; // Read 2nd Line
          let cards;
          try {
            // v2 Deck Data Format
            const trimmedData = dataLine.trim() // Remove excess whitespace
            const base64Data = trimmedData.substring(1, trimmedData.length - 2); // Remove excess whitespace, trailing semicolon, and quotes
            const decodedData = atob(base64Data); // Base 64 decode
            const jsonData = decodeURI(decodedData); // URI decode
            cards = JSON.parse(jsonData); // JSON parse
          } catch (err) {
            console.error(err);
            // v1 Deck Data Format
            cards = JSON.parse(dataLine.substring(0, dataLine.length - 1)); // Remove Trailing Semicolon and parse
          }
          // @ts-expect-error Legacy Card Input Compatibiity
          const deck = cards.map((card) => {
            const sanitisedCard = sanitiseCard(card);
            if (globalSubmit) {
              sanitisedCard.location = 'box'; // Start with all cards deselected when uploading to global
            }
            return sanitisedCard;
          });

          // Process images for preview
          deck.forEach(async (card: Card, i: number, arr: Card[]) => {
            if (card.content.image && card.content.image?.startsWith('data:image/png;base64,')) {
              dispatchImage({ id: i, value: card.content.image }) // Cache the Uncompressed Image
              card.content.image = await compressImage(await resizeImage(card.content.image)); // Import Compressed image
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
      let deckFile;
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
  }, [fileSelector, globalSubmit])

  // Batch Submissions
  useEffect(() => {
    // In Progress
    if (progress[0] >= 0 && progress[0] < progress[1]) {
      const bounds = [ progress[0], Math.min((progress[0] + 25), progress[1]) ] // 25 cards per second
      const cards = loaded.slice(...bounds).filter((card) => card.location == 'deck');
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
            location: 'deck',
            likes: card?.likes ?? undefined,
            timestamp: Number(new Date()),
          }
        });
        moves.loadCards(createdCards);
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
    }

      // Submit loaded cards to server
    const submitLoaded = () => {
      setProgress([0, progress[1]]); // Begin submitting from the start
    }

    setDisplayLoader(
      <wired-dialog open={mode == 'menu-tools-loader' ? true : undefined} onClick={(e) => { setMode('menu-tools'); e.stopPropagation() }}>
        <div style={styles.loader} onClick={(e) => e.stopPropagation()}>
          <div style={styles.title}>
            Deck Loader
          </div>
          <div>
          {
            loaded.length > 0 ?
              <wired-card>
                <div style={styles.info}>
                  <div style={styles.listbutton} onClick={() => { setLoaded(loaded.map((card) => { card.location = 'deck'; return card })); }}>
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
                  <div style={styles.listbutton} onClick={() => { setLoaded(loaded.map((card) => { card.location = 'box'; return card })); }}>
                    <Icon name='exit' />
                  </div>
                </div>
                <div style={styles.preview}>
                  {loaded.length > 0 && loaded.map((card: Card, i) => {
                    return (<div key={`loader-preview-${i}`} style={{ ...styles.previewItem, color: card.location == 'box' ? 'grey' : 'black', backgroundColor: card.location == 'box' ? 'white' : '#eee' }} onClick={() => {
                      if (progress[0] == -1) {
                        loaded[i].location = (card.location == 'deck') ? 'box' : 'deck'; setLoaded([...loaded])
                      }}}>
                      <div style={styles.previewNumber}>
                        {card.location == 'deck' && (i < progress[0]) && '*'}{i + 1}
                      </div>
                      <img style={styles.previewImage} src={imageCache[i]}></img>
                      {card.content.title}
                    </div>)
                  })}
                </div>
                <div style={styles.prompt}>
                  {globalSubmit ? 'Limited to ONE card per submission' : 'Tap cards to include/exclude'}
                </div>
              </wired-card> :
              <div style={styles.instructionsContainer} >
                {
                  !isMultiplayer &&
                  <>
                    <wired-card style={{...styles.instructions }} onClick={() => { setGlobalSubmit(true); document.getElementById('fileselector')?.click() }}>
                      <Icon name='global' />
                      Submit to the Global Deck
                    </wired-card>
                    or
                  </>
                }
                <wired-card style={{...styles.instructions }} onClick={() => { setGlobalSubmit(false); document.getElementById('fileselector')?.click() }}>
                  <Icon name='display' />
                  Load cards into this session
                </wired-card>
                <div id="fileCard" style={styles.prompt}>
                  From a Saved Deck File
                </div>
              </div>
          } 
          </div>
          <input disabled={progress[0] != -1} style={styles.uploader} type="file" id="fileselector" accept=".html" onChange={uploadDeck} />
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
        </div>
      </wired-dialog>
    )
  }, [globalSubmit, height, imageCache, isMultiplayer, leaveLoader, loaded, mode, progress, setMode, uploadDeck, width])

  return (displayLoader)
}