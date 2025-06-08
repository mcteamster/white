import type { Properties } from 'csstype';
import { startingDeck } from '../lib/clients';
import { useEffect, useState } from "react";
import { Card } from "../Cards";
import { ImageCacheType } from "../lib/contexts";
import { BLANK_IMAGE, decompressImage } from "../lib/images";
import { Search } from "./Gallery";

const styles: { [key: string]: Properties<string | number> } = {
  gallery: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cards: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: '1200px',
    padding: '5em 0',
  },
  card: {
    width: '80vw',
    margin: '10px',
    padding: '10px',
    boxSizing: 'border-box',
    border: '1px solid #ccc',
    borderRadius: '8px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'center',
  },
  cardImage: {
    width: '100px',
    height: '100px',
  },
  cardInfo: {
    flex: 1,
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    textAlign: 'left',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  cardCredit: {
    fontSize: '14px',
    color: '#555',
    marginBottom: '4px',
  },
  header: {
    width: '100%',
    height: '4em',
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '10',
    backgroundColor: 'white',
    borderBottom: '0.5pt solid black',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
};

function EditorRow(props: Card) {  
  return (
    <div style={styles.card} id={`editor-${props.id}`}>
      {props.id !== 0 && <img style={styles.cardImage} src={props.content.image || BLANK_IMAGE} alt={props.content.title} />}
      <div style={styles.cardInfo}>
        <div style={styles.cardTitle}>{props.content.title}</div>
        <div style={styles.cardCredit}>
          {props.content.date && new Date(Number(props.content.date)).toLocaleDateString()} by {props.content.author} 
        </div>
        <div style={styles.cardTitle}>{props.content.description}</div>
      </div>
    </div>
  );
}

export function Editor() {
  const [deckCards, setDeckCards] = useState<Card[]>([]);
  const [displayedCards, setDisplayedCards] = useState<Card[]>([]);
  const [imageCache, setImageCache] = useState<ImageCacheType>({});

  useEffect(() => {
    // Load initial cards from data service
    const loadCards = async () => {
      try {
        setDeckCards(startingDeck.cards);
        setDisplayedCards(startingDeck.cards);
      } catch (error) {
        console.error('Failed to load cards:', error);
      }
    };
    loadCards();
  }, []);

  useEffect(() => {
    const loadImages = async () => {
      const newCache: ImageCacheType = {};
      for (const card of displayedCards) {
        if (card.id !== 0) {
          try {
            newCache[card.id] = await decompressImage(card.content.image || '');
          } catch (error) {
            console.error(`Failed to load image for card ${card.id}:`, error);
          }
        }
      }
      setImageCache(newCache);
    };
    loadImages();
  }, [displayedCards]);

  return (
    <div style={styles.gallery}>
      <div style={styles.header}>
        <Search allCards={deckCards} setDisplayedCards={setDisplayedCards} />
      </div>
      <div style={styles.cards}>
        {displayedCards.map((card: Card) => (
          <EditorRow
            key={card.id}
            {...card}
            content={{
              ...card.content,
              image: imageCache[card.id] || BLANK_IMAGE,
            }}
          />
        ))}
      </div>
    </div>
  );
}