import type { Properties } from 'csstype';
import type { Card } from '../Cards.ts';
import { Link } from 'react-router';
import { Icon } from './Icons.tsx';
import { ReactElement, useCallback, useContext, useEffect, useState } from 'react';
import { BLANK_IMAGE, decompressImage } from '../lib/images.ts';
import { ImageCacheContext } from '../lib/contexts.ts';

export function CardFace(card: Card) {
  const [ displayedCard, setDisplayedCard] = useState(<></>);
  const [image, setImage] = useState(BLANK_IMAGE);
  const { imageCache } = useContext(ImageCacheContext);

  const display = useCallback((element: ReactElement) => {
    setDisplayedCard(element)
  }, [])

  useEffect(() => {
    // Define Image
    if (card.id) {
      if (imageCache[card.id]) { // Use cached image if available
        console.debug('Image Cache Hit')
        setImage(imageCache[card.id])
      } else if (card.content.image?.startsWith('data:image/png;base64,')) { // Support PNG Data URIs
        console.debug('Image Passthrough')
        setImage(card.content.image)
      } else if (card.content.image) { // Decompress RLE UTF-8 String
        console.debug('Image Decompression on Demand')
        decompressImage(card.content.image).then(res => {
          setImage(res)
        });
      }
    }

    const baseStyles: {[key: string]: Properties<string | number>} = {
      card: {
        borderRadius: '0.5em',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'center',
      }
    }

    let localDate;
    if (card.content.date) {
      localDate = new Date(Number(card.content.date)).toLocaleDateString();
    }

    if (card.location === 'hand') {
      const styles: {[key: string]: Properties<string | number>} = {
        card: {
          height: '10em',
          width: '6em',
          margin: '0.25em 0.1em',
          justifyContent: 'center',
        },
        title: {
          width: '100%',
          fontSize: '1em',
          fontWeight: 'bold',
        },
        image: {
          width: '100%',
          objectFit: 'cover',
        },
      };
      display(
        <wired-card style={{...baseStyles.card, ...styles.card}} elevation={1}>
          <div style={styles.title}>{card.content.title}</div>
          <img style={styles.image} src={image || BLANK_IMAGE}></img>
        </wired-card>
      );
    } else if (card.location === 'table') {
      const styles: {[key: string]: Properties<string | number>} = {
        card: {
          height: '3em',
          width: '3em',
          margin: '0.25em 0.1em',
          justifyContent: 'center',
        },
        image: {
          width: '3em',
          objectFit: 'cover',
        },
      };
      display(
        <wired-card style={{...baseStyles.card, ...styles.card}} elevation={1}>
          <img style={styles.image} src={image || BLANK_IMAGE}></img>
        </wired-card>
      );
    }
    else if (card.location === 'pile') {
      const styles: {[key: string]: Properties<string | number>} = {
        card: {
          height: '100%',
          minHeight: '20em',
          maxHeight: '36em',
          width: '20em',
          justifyContent: 'space-around',
        },
        title: {
          fontSize: '1.5em',
        },
        image: {
          width: '100%',
          maxWidth: '18em',
          height: '100%',
          maxHeight: '18em',
          objectFit: 'cover',
        },
        description: {
          width: '100%',
          height: '8em',
          fontSize: '1em',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        },
        credit: {
          fontSize: '0.75em',
          textAlign: 'center',
        },
      };

      let content = <></>;
      if (card.id == 0) {
        content = <>
          <div style={{fontSize: '2.5em'}}>Blank White Cards</div>
          <div style={{...styles.description, fontSize: '1.5em'}}>
            Pick up cards.<br></br>
            Do what they say.<br></br>
            Create your own!
          </div>
          <Link to="https://mcteamster.com" target='_blank' rel="noreferrer" style={{ textDecoration: 'none' }}>
            <Icon name='game' />
            <div>a game by <u>mcteamster</u></div>
          </Link>
        </>
      } else {
        content = <>
          {<img style={styles.image} src={image || BLANK_IMAGE}></img>}
          <div style={styles.title}>{card.content.title}</div>
          <div style={styles.description}>{card.content.description}</div>
          <div style={styles.credit}>{card.content.author && `${card.content.author}`}{card.content.date && ` - ${localDate}`}</div>
        </>
      }

      display(
        <wired-card style={{...baseStyles.card, ...styles.card}} elevation={1}>
          {content}
        </wired-card>
      );
    }
  }, [card, image, imageCache, display])

  return (displayedCard)
}