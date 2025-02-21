import { Move } from "boardgame.io";
import { Properties } from "csstype";
import { useWindowDimensions } from "../lib/hooks";
import { sanitiseCard } from "../lib/data";
import { useState } from "react";
import { Card } from "../Cards";

interface LoaderProps {
  submitCard: Move;
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
}

export function Loader({ submitCard, mode, setMode }: LoaderProps) {
  const { width, height } = useWindowDimensions();
  const [loaded, setLoaded] = useState([]);

  const styles: { [key: string]: Properties<string | number> } = {
    loader: {
      width: width * 0.7,
      height: height * 0.7,
      zIndex: '8',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    preview: {
      maxHeight: '10em',
      overflowY: 'scroll',
    }
  }

  const uploadDeck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const reader = new FileReader();
    reader.onload = (event: any) => {
      try {
        const dataLine = event.target.result.split("\n")[1]; // Read 2nd Line
        const cards = JSON.parse(dataLine.substring(0, dataLine.length -1)); // Remove Trailing Semicolon and parse
        const deck = cards.map((card: any) => {
          return sanitiseCard(card);
        });
        setLoaded(deck);
      } catch(err) {
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

  const uploadPreview = <>
    {loaded.map((card: Card, i) => {
      return (<div key={`loader-preview-${i}`}>
        {card.id}: {card.content.title}
      </div>)
    })}
  </>

  return (
    <wired-dialog open={mode == 'menu-tools-loader' ? true : undefined} onClick={() => { setMode('menu-tools') }}>
      <div style={styles.loader} onClick={(e) => e.stopPropagation()}>
        <div>
          Deck Loader
        </div>
        <div>
          <input type="file" id="fileselector" accept=".html" required onChange={uploadDeck} />
          Select a File
        </div>
        <div style={styles.preview}>
          {uploadPreview}
        </div>
      </div>
    </wired-dialog>
  )
}