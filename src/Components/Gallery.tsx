import { useNavigate, useParams } from "react-router";
import type { Properties } from 'csstype';
import { Browse } from './Icons';
import { startingDeck } from '../constants/clients';

export function Gallery() {
  const navigate = useNavigate();

  const styles: { [key: string]: Properties<string | number> } = {
    focus: {
      width: '100%',
      height: '100%',
      gridRow: '1/10',
      gridColumn: '1/10',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      width: 'min(70vw, 45vh)',
      fontSize: '1.5em',
      fontWeight: 'bold',
    },
    image: {
      width: 'min(70vw, 45vh)',
      objectFit: 'cover',
    },
    description: {
      width: 'min(70vw, 45vh)',
      height: '8em',
      maxHeight: '20vh',
      fontSize: '1em',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    credit: {
      fontSize: '0.8em',
      borderColor: 'white',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    tray: {
      width: 'min(70vw, 45vh)',
      height: '100%',
      display: 'flex',
      flexWrap: 'wrap',
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    button: {
      height: '3em',
      width: '3em',
      minWidth: '25%',
      maxWidth: 'min(70vw, 45vh)',
      borderRadius: '1em',
      fontWeight: 'bold',
      display: 'flex',
      flexGrow: '1',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#333',
    },
  };

  const globalDeck = startingDeck;
  const params = useParams();
  let viewedCard = globalDeck.cards.find((card) => card.id == Number(params.cardID));
  let localDate;

  if (viewedCard) {
    if (viewedCard.content.date) {
      localDate = new Date(Number(viewedCard.content.date)).toLocaleDateString();
    }

    const browse = <>
      { 
        Number(params.cardID) > 1 &&
        <div onClick={() => { navigate(`/card/${Number(params.cardID) - 1}`) }}>
          <Browse type="prev" />
        </div>
      }
      { 
        Number(params.cardID) < globalDeck.cards.length &&
        <div onClick={() => { navigate(`/card/${Number(params.cardID) + 1}`) }}>
          <Browse type="next" />
        </div>
      }
    </>

    return (
      <>
        {`${window.location}`}
        <wired-dialog open>
          <div style={styles.focus}>
            <div style={styles.title}>{viewedCard.content.title}</div>
            <div style={styles.credit}>by {viewedCard.content.author}</div>
            <div style={styles.credit}>{localDate ? `${localDate}` : ''}</div>
            <img style={styles.image} src={viewedCard.content.image} />
            <div style={styles.description}>{viewedCard.content.description}</div>
            {browse}
          </div>
        </wired-dialog>
      </>
    );
  } else {
    return (
      <div>
        Card Gallery Coming Soon
      </div>
    );
  }
}