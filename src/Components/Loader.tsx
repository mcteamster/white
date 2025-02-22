import { Properties } from "csstype";
import { useWindowDimensions } from "../lib/hooks";
import { sanitiseCard } from "../lib/data";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, getCardsByLocation } from "../Cards";
import { Icon } from "./Icons";
import { BoardProps } from "boardgame.io/dist/types/packages/react";
import { GameState } from "../Game";

interface LoaderProps extends BoardProps<GameState> {
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
}

export function Loader({ moves, mode, setMode }: LoaderProps) {
  const { width, height } = useWindowDimensions();
  const [preset, setPreset] = useState('' as PresetDecks); // Which kind of deck to load
  const [loaded, setLoaded] = useState([] as Card[]); // List of cards staged for submitting
  const [submitting, setSubmitting] = useState(0); // Tracker of currently processed load
  const loadedLength = useRef(loaded.length) // Length of deck to be uploaded
  
  // Select deck to upload
  type PresetDecks = 'custom' | 'global' | 'standard' | '';

  const selectDeck = useCallback(async (preset: PresetDecks) => {
    const radios = document.getElementsByClassName('radioPreset');
    for(let i = 0; i < radios.length; i++) {
      const button = radios[i] as HTMLInputElement;
      if(button.value != preset) {
        button.checked = false;
      }
    }

    if (preset != 'custom') {
      let deck: Card[] = [];
      if (preset == 'global') {
        deck = (await (await fetch('/decks/global.json')).json()).cards;
        setLoaded(deck);
        loadedLength.current = deck.length;
      } else if (preset == 'standard') {
        deck = (await (await fetch('/decks/standard.json')).json()).cards;
        setLoaded(deck);
        loadedLength.current = deck.length;
      }
      setLoaded(deck);
      loadedLength.current = deck.length;
    }
  }, [setLoaded])

  const uploadDeck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (event.target && event.target.result) {
          const result = event.target.result as string;
          const dataLine = result.split("\n")[1]; // Read 2nd Line
          const cards = JSON.parse(dataLine.substring(0, dataLine.length - 1)); // Remove Trailing Semicolon and parse
          // @ts-expect-error Legacy Card Input Compatibiity
          const deck = cards.map((card) => {
            return sanitiseCard(card);
          });
          setPreset('custom');
          setLoaded(deck);
          loadedLength.current = loaded.length;
        }
      } catch (err) {
        console.error(err)
      }
    }

    try {
      let deckFile;
      if (e.target.files) {
        deckFile = e.target.files[0];
        reader.readAsText(deckFile);
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    selectDeck(preset)
  }, [preset, selectDeck])

  // Submit loaded cards to server
  const submitLoaded = () => {
    setSubmitting(1); // Start submitting from the first card
  }

  useEffect(() => {
    if (submitting > 0 && submitting < loadedLength.current + 1) {
      const bounds = [ submitting - 1, Math.min((submitting + 14), loadedLength.current) ] // 15 cards per second
      const cards = loaded.slice(...bounds).filter((card) => card.location == 'deck');
      if (cards.length == 0) {
        // Skip immediately
        setTimeout(() => {
          setSubmitting(bounds[1] + 1);
        }, 0)
      } else {
        const createdCards: Card[] = cards.map((card) => { 
          return {
            id: 0, // ID Assignment handled by move
            content: card.content,
            location: 'deck',
            focused: [],
            timestamp: Number(new Date()),
          }
        });
        moves.loadCards(createdCards);
        // Wait a moment before submitting again
        setTimeout(() => {
          setSubmitting(bounds[1] + 1);
        }, 1000);
      }
    } else {
      setTimeout(() => {
        setSubmitting(0); // 0 means not submitting anything
        setPreset(''); // Clear loaded preview
        setMode('play');
      }, 0)
    }
  }, [submitting, setSubmitting, moves, setMode, setPreset])

  const loadedPreview = <>
    {loaded.length > 0 && loaded.map((card: Card, i) => {
      // TODO: toggle cards here
      return (<li key={`loader-preview-${i}`} style={{ color: card.location == 'box' ? 'grey' : 'black' }}>
        {card.content.title}{card.location == 'deck' && (i < submitting - 1) && '*'}
      </li>)
    })}
  </>

  const styles: { [key: string]: Properties<string | number> } = {
    loader: {
      width: width * 0.75,
      height: height * 0.75,
      padding: '1em',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    title: {
      fontSize: '2em',
    },
    info: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    preview: {
      minWidth: '10em',
      margin: '0',
      maxHeight: '35vh',
      overflowY: 'scroll',
    },
    instructions: {
      width: '10em',
      maxHeight: '35vh',
      textAlign: 'center',
    },
    selection: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    presets: {
      padding: '1em',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    uploader: {
      maxWidth: '20em',
      fontFamily: "'Patrick Hand SC', Arial, Helvetica, sans-serif",
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

  return (
    <wired-dialog open={mode == 'menu-tools-loader' ? true : undefined} onClick={() => { setMode('menu-tools') }}>
      <div style={styles.loader} onClick={(e) => e.stopPropagation()}>
        <div style={styles.title}>
          Deck Loader
        </div>
        {
          loaded.length > 0 ?
            <wired-card>
              <div style={styles.info}>
                {`${getCardsByLocation(loaded, 'deck').length}/${loaded.length} Selected - ${(100*submitting/loaded.length).toFixed(0)}% Complete` }
              </div>
              <ol style={styles.preview}>
                {loadedPreview}
              </ol>
            </wired-card> :
            <div style={styles.instructions}>
              Load cards into the game from Preset Decks or Import your previously Downloaded Decks!
            </div>
        }
        <div style={styles.selection}>
          <div style={styles.presets}>
            <div>
              <input type="checkbox" className="radioPreset" value="global" onChange={(e) => { if (e.target.checked) { setPreset('global') } else { setPreset('') }}} />
              Global Deck
            </div>
            <div>
              <input type="checkbox" className="radioPreset" value="standard" onChange={(e) => { if (e.target.checked) { setPreset('standard') } else { setPreset('') }}} />
              Standard Cards
              <input type="checkbox" id="radioJokers" />
              Jokers
            </div>
          </div>
          or Upload from File
          <wired-card>
            <input style={styles.uploader} type="file" id="fileselector" accept=".html" onChange={uploadDeck} />
          </wired-card>
        </div>
        <div style={styles.confirmation}>
          <wired-card style={styles.button} onClick={() => { setMode('play') }}>
            <Icon name='exit' />Close
          </wired-card>
          <wired-card style={{ ...styles.button, color: (loaded.length > 0) ? 'red' : 'grey' }} onClick={() => { if (loaded.length > 0) { setPreset(''); setMode('play') } }}>
            <Icon name='discard' />{(submitting == 0) ? 'Cancel' : 'Stop'}
          </wired-card>
          <wired-card style={{ ...styles.button, color: ((submitting == 0) && (getCardsByLocation(loaded, 'deck').length > 0)) ? undefined : 'grey' }} onClick={() => { if (submitting == 0) { submitLoaded() }}}>
            <Icon name='done' />{(submitting == 0) ? 'Upload' : 'Uploading'}
          </wired-card>
        </div>
      </div>
    </wired-dialog>
  )
}