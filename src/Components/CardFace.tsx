import type { Properties } from 'csstype';
import type { Card } from '../Cards.ts';
import { Link } from 'react-router';
import { Icon } from './Icons.tsx';
import { ReactElement, useCallback, useContext, useEffect, useState } from 'react';
import { ImageCacheContext } from '../lib/contexts.ts';
import { BLANK_IMAGE } from '../lib/images.ts';

export function CardFace(card: Card) {
  const [ displayedCard, setDisplayedCard] = useState(<></>);
  const { imageCache } = useContext(ImageCacheContext);

  const display = useCallback((element: ReactElement) => {
    setTimeout(setDisplayedCard, 0, element)
  }, [])

  useEffect(() => {
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
          <img style={styles.image} src={imageCache[card.id] || BLANK_IMAGE}></img>
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
          <img style={styles.image} src={imageCache[card.id] || BLANK_IMAGE}></img>
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
          {<img style={styles.image} src={imageCache[card.id] || BLANK_IMAGE}></img>}
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
    } else {
      const styles: {[key: string]: Properties<string | number>} = {
        card: {
          width: '9em',
          height: '9em',
          borderRadius: '0.5em',
          backgroundColor: 'white',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        title: {
          fontSize: '1em',
          fontWeight: 'bold',
        },
        image: {
          width: '4em',
          height: '4em',
        },
        credit: {
          fontSize: '0.75em',
          textAlign: 'center',
        },
      };

      const content = <>
          <div style={styles.title}>{card.content.title}</div>
          <div style={styles.credit}>{card.content.author && `${card.content.author}`}</div>
          <div style={styles.credit}>{card.content.date && `${localDate}`}</div>
      </>

      display(
        <wired-card style={{...styles.card}} elevation={1}>
          {card.id != 0 && <img style={styles.image} src={imageCache[card.id] || BLANK_IMAGE}></img>}
          {content}
        </wired-card>
      )
    }
  })

  return (displayedCard)
}