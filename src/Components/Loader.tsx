import { Properties } from "csstype";
import { useWindowDimensions } from "../lib/hooks";
import { sanitiseCard } from "../lib/data";
import { useEffect, useState } from "react";
import { Card, getCardsByLocation } from "../Cards";
import { Icon } from "./Icons";
import { BoardProps } from "boardgame.io/dist/types/packages/react";
import { GameState } from "../Game";

interface LoaderProps extends BoardProps<GameState> {
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
}

export function Loader({ G, moves, mode, setMode }: LoaderProps) {
  const { width, height } = useWindowDimensions();
  const [preset, setPreset] = useState('' as PresetDecks);
  const [loaded, setLoaded] = useState([] as Card[]);
  const [submitting, setSubmitting] = useState(0);
  
  type PresetDecks = 'custom' | 'global' | 'standard' | '';

  const selectDeck = async (preset: PresetDecks) => {
    const radios = document.getElementsByClassName('radioPreset');
    for(let i = 0; i < radios.length; i++) {
      const button = radios[i] as HTMLInputElement;
      if(button.value != preset) {
        button.checked = false;
      }
    }

    if (preset == 'global') {
      setLoaded((await (await fetch('/decks/global.json')).json()).cards);
    } else if (preset == 'standard') {
      setLoaded((await (await fetch('/decks/standard.json')).json()).cards);
    } else if (preset != 'custom') {
      setLoaded([]);
    }
  }

  useEffect(() => {
    selectDeck(preset)
  }, [preset])

  const uploadDeck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const reader = new FileReader();
    reader.onload = (event: any) => {
      try {
        const dataLine = event.target.result.split("\n")[1]; // Read 2nd Line
        const cards = JSON.parse(dataLine.substring(0, dataLine.length - 1)); // Remove Trailing Semicolon and parse
        const deck = cards.map((card: any) => {
          return sanitiseCard(card);
        });
        selectDeck('custom');
        setLoaded(deck);
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

  const submitLoaded = (): any => {
    setSubmitting(1); // Start submitting from the first index
  }

  useEffect(() => {
    if (submitting > 0 && submitting < loaded.length + 1) {
      const card = loaded[submitting - 1];
      if (card.location == 'box') {
        // Skip immediately
        setSubmitting(submitting + 1);
      } else if (card.location == 'deck') {
        const createdCard: Card = {
          id: G.cards.length + 1,
          content: card.content,
          location: 'deck',
          focused: [],
          timestamp: Number(new Date()),
        }
        moves.submitCard(createdCard);
        // Wait a moment before submitting again
        setTimeout(() => {
          setSubmitting(submitting + 1);
        }, 250);
      }
    } else {
      setSubmitting(0); // 0 means not submitting anything
      setLoaded([]);
      setMode('play');
    }
  }, [submitting, setSubmitting])

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
              <input type="checkbox" className="radioPreset" value="global" onChange={(e) => { e.target.checked ? setPreset('global') : setPreset('') }} />
              Global Deck
            </div>
            <div>
              <input type="checkbox" className="radioPreset" value="standard" onChange={(e) => { e.target.checked ? setPreset('standard') : setPreset('') }} />
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
            <Icon name='discard' />Cancel
          </wired-card>
          <wired-card style={{ ...styles.button, color: ((submitting == 0) && (getCardsByLocation(loaded, 'deck').length > 0)) ? undefined : 'grey' }} onClick={() => { (submitting == 0) && submitLoaded() }}>
            <Icon name='done' />Upload
          </wired-card>
        </div>
      </div>
    </wired-dialog>
  )
}