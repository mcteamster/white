import { useState, useEffect } from 'react';
import { Properties } from 'csstype';
import { Card } from '../../Cards';
import { Icon } from '../Icons';
import { BLANK_IMAGE, decompressImage } from '../../lib/images';

// Card Image Component
function CardImage({ card }: { card: Card }) {
  const [imageSrc, setImageSrc] = useState(BLANK_IMAGE);
  const [loading, setLoading] = useState(false);

  const styles: { [key: string]: Properties<string | number> } = {
    image: {
      width: '100%',
      maxWidth: '18em',
      height: '100%',
      maxHeight: '18em',
      objectFit: 'cover'
    },
    spinner: {
      width: '2em',
      height: '2em',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }
  };

  useEffect(() => {
    if (card.content.image?.startsWith('data:image/png;base64,')) {
      setImageSrc(card.content.image);
      setLoading(false);
    } else if (card.content.image) {
      setLoading(true);
      decompressImage(card.content.image).then(decompressed => {
        setImageSrc(decompressed);
        setLoading(false);
      });
    } else {
      setImageSrc(BLANK_IMAGE);
      setLoading(false);
    }
  }, [card.id, card.content.image]);

  if (loading) {
    return (
      <div style={styles.spinner} className="spin">
        <Icon name="loading" />
      </div>
    );
  }

  return (
    <img 
      src={imageSrc} 
      alt={card.content.title || 'Card image'} 
      style={styles.image}
    />
  );
}

// Full Card View Component
export function FullCardView({ card, isSelected, onCardSelect }: { 
  card: Card; 
  isSelected: boolean; 
  onCardSelect: (cardId: number) => void; 
}) {
  let localDate;
  if (card.content.date) {
    localDate = new Date(Number(card.content.date)).toLocaleDateString();
  }

  const styles: { [key: string]: Properties<string | number> } = {
    card: {
      borderRadius: '0.5em',
      backgroundColor: 'white',
      minHeight: '20em',
      maxHeight: '36em',
      width: '20em',
      alignSelf: 'flex-start',
      cursor: 'pointer'
    },
    cardSelected: {
      color: 'red'
    },
    cardHidden: {
      opacity: 0.5
    },
    cardContent: {
      display: 'flex',
      flexDirection: 'column',
      textAlign: 'center',
      overflowWrap: 'anywhere',
      justifyContent: 'flex-end',
      alignItems: 'center',
      height: '100%',
      padding: '0.5em'
    },
    imageContainer: {
      width: '18em',
      height: '18em',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      flexShrink: 0,
      alignSelf: 'center'
    },
    title: {
      fontSize: '1.5em',
      color: 'black',
      wordBreak: 'break-word',
      overflowWrap: 'break-word'
    },
    description: {
      width: '100%',
      height: '8em',
      fontSize: '1em',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'black',
      wordBreak: 'break-word',
      overflowWrap: 'break-word'
    },
    credit: {
      fontSize: '0.75em',
      textAlign: 'center',
      color: 'black'
    }
  };

  return (
    <wired-card 
      key={card.id} 
      style={{
        ...styles.card,
        ...(isSelected ? styles.cardSelected : {}),
        ...(card.location === 'box' ? styles.cardHidden : {})
      }} 
      elevation={1}
      onClick={() => onCardSelect(card.id)}
    >
      <div style={styles.cardContent}>
        <div style={styles.imageContainer}>
          <CardImage card={card} />
        </div>
        <div style={styles.title}>{card.content.title}</div>
        <div style={styles.description}>
          {card.content.description}
        </div>
        <div style={styles.credit}>
          {card.content.author && `by ${card.content.author}`}{card.content.date && ` - ${localDate}`}
        </div>
      </div>
    </wired-card>
  );
}

// Compact Card View Component
export function CompactCardView({ card, isSelected, onCardSelect }: { 
  card: Card; 
  isSelected: boolean; 
  onCardSelect: (cardId: number) => void; 
}) {
  const styles: { [key: string]: Properties<string | number> } = {
    card: {
      padding: '0.5em',
      height: '100px',
      width: '100%',
      maxWidth: '600px',
      backgroundColor: 'white',
      cursor: 'pointer'
    },
    container: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1em',
      height: '100%'
    },
    thumbnail: {
      width: '100px',
      height: '100px',
      backgroundColor: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      flexShrink: 0
    },
    content: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      height: '100%'
    },
    title: {
      margin: '0 0 0.25em 0',
      fontSize: '1em',
      color: 'black',
      wordBreak: 'break-word',
      overflowWrap: 'break-word'
    },
    description: {
      margin: 0,
      fontSize: '0.8em',
      color: '#666',
      wordBreak: 'break-word',
      overflowWrap: 'break-word'
    },
    noImage: {
      color: '#999',
      fontSize: '0.7em'
    }
  };

  return (
    <wired-card 
      key={card.id} 
      style={{
        ...styles.card,
        backgroundColor: 'white',
        color: isSelected ? 'red' : 'black',
        opacity: card.location === 'box' ? 0.5 : 1
      }}
      onClick={() => onCardSelect(card.id)}
    >
      <div style={styles.container}>
        <div style={styles.thumbnail}>
          {card.content.image ? (
            <CardImage card={card} />
          ) : (
            <div style={styles.noImage}>No Image</div>
          )}
        </div>
        
        <div style={styles.content}>
          <h4 style={styles.title}>{card.content.title}</h4>
          <p style={styles.description}>{card.content.description}</p>
        </div>
      </div>
    </wired-card>
  );
}

// Image Only Card View Component
export function ImageOnlyCardView({ card, isSelected, onCardSelect }: { 
  card: Card; 
  isSelected: boolean; 
  onCardSelect: (cardId: number) => void; 
}) {
  const styles: { [key: string]: Properties<string | number> } = {
    card: {
      padding: '0.25em',
      height: '60px',
      width: '60px',
      backgroundColor: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer'
    },
    imageContainer: {
      width: '50px',
      height: '50px',
      backgroundColor: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden'
    },
    noImage: {
      color: '#999',
      fontSize: '0.7em',
      textAlign: 'center'
    }
  };

  return (
    <wired-card 
      key={card.id} 
      style={{
        ...styles.card,
        backgroundColor: 'white',
        color: isSelected ? 'red' : 'black',
        opacity: card.location === 'box' ? 0.5 : 1
      }}
      onClick={() => onCardSelect(card.id)}
    >
      <div style={styles.imageContainer}>
        {card.content.image ? (
          <CardImage card={card} />
        ) : (
          <div style={styles.noImage}>No Image</div>
        )}
      </div>
    </wired-card>
  );
}
