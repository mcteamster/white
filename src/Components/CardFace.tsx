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
        height: '160px',
        width: '100px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center',
      },
      title: {
        width: '100px',
        fontSize: '0.75em',
        fontWeight: 'bold',
      },
      image: {
        width: '100px',
        objectFit: 'cover',
      },
    };
    return (
      <wired-card style={styles.card} elevation={2}>
        <div style={styles.title}>{card.content.title}</div>
        <img style={styles.image} src={card.content.image}></img>
      </wired-card>
    );
  } else if (card.location === 'table') {
    const styles: {[key: string]: Properties<string | number>} = {
      card: {
        height: '50px',
        width: '50px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center',
      },
      image: {
        width: '50px',
        objectFit: 'cover',
      },
    };
    return (
      <wired-card style={styles.card} elevation={2}>
        <img style={styles.image} src={card.content.image}></img>
      </wired-card>
    );
  }
  else if (card.location === 'pile') {
    const styles: {[key: string]: Properties<string | number>} = {
      pile: {
        height: '100%',
        maxHeight: '480px',
        width: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        textAlign: 'center',
      },
      title: {
        fontWeight: 'bold',
      },
      image: {
        width: '100%',
        maxWidth: '300px',
        height: '100%',
        maxHeight: '300px',
        objectFit: 'cover',
      },
      description: {
        width: '100%',
        height: '140px',
        fontSize: '0.85em',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
      credit: {
        fontSize: '0.6em',
        borderColor: 'white',
      },
    };
    return (
      <wired-card style={styles.pile} elevation={4}>
        <img style={styles.image} src={card.content.image ?? "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="}></img>
        <div style={styles.title}>{card.content.title}</div>
        <div style={styles.credit}>by {card.content.author} {localDate ? `on ${localDate}` : ''}</div>
        <div style={styles.description}>{card.content.description}</div>
      </wired-card>
    );
  } else {
    return <></>
  }
}