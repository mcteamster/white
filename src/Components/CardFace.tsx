import type { Properties } from 'csstype';
import type { Card } from '../Cards.ts';

export function CardFace(card: Card) {
  let localDate;
  if (card.content.date) {
    localDate = new Date(Number(card.content.date)).toLocaleDateString();
  }

  if (card.location === 'hand') {
    const styles: {[key: string]: Properties<string | number>} = {
      card: {
        height: '10em',
        width: '6em',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center',
      },
      title: {
        width: '100%',
        fontSize: '0.75em',
        fontWeight: 'bold',
      },
      image: {
        width: '100%',
        objectFit: 'cover',
      },
    };
    return (
      <wired-card style={styles.card} elevation={1}>
        <div style={styles.title}>{card.content.title}</div>
        <img style={styles.image} src={card.content.image}></img>
      </wired-card>
    );
  } else if (card.location === 'table') {
    const styles: {[key: string]: Properties<string | number>} = {
      card: {
        height: '3em',
        width: '3em',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center',
      },
      image: {
        width: '3em',
        objectFit: 'cover',
      },
    };
    return (
      <wired-card style={styles.card} elevation={1}>
        <img style={styles.image} src={card.content.image}></img>
      </wired-card>
    );
  }
  else if (card.location === 'pile') {
    const styles: {[key: string]: Properties<string | number>} = {
      pile: {
        height: '100%',
        maxHeight: '32em',
        width: '20em',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textAlign: 'center',
      },
      title: {
        fontSize: '1.5em',
        fontWeight: 'bold',
      },
      image: {
        width: '100%',
        maxWidth: '20em',
        height: '100%',
        maxHeight: '20em',
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
        borderColor: 'white',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
      },
    };
    return (
      <wired-card style={styles.pile} elevation={1}>
        <img style={styles.image} src={card.content.image ?? "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="}></img>
        <div style={styles.title}>{card.content.title}</div>
        <div style={styles.description}>{card.content.description}</div>
        <div style={styles.credit}><span>by {card.content.author}</span><span>{localDate ? `${localDate}` : ''}</span></div>
      </wired-card>
    );
  } else {
    return <></>
  }
}