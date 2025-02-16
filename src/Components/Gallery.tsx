import { useNavigate, useParams } from "react-router";
import type { Properties } from 'csstype';
import { Browse, Icon } from './Icons';
import { startingDeck } from '../constants/clients';
import { CardFace } from "./CardFace";
import { useState } from "react";

export function Gallery() {
  const navigate = useNavigate();

  const styles: { [key: string]: Properties<string | number> } = {
    cards: {
      width: '100%',
      height: '100%',
      padding: '1em 0 5em 0',
      gridRow: '1/10',
      gridColumn: '1/10',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
    },
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
    footer: {
      width: '100%',
      height: '4em',
      position: 'fixed',
      bottom: '0',
      left: '0',
      zIndex: '10',
      backgroundColor: 'white',
      borderTop: '0.5pt solid black',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
  };

  const globalDeck = startingDeck;
  const params = useParams();
  let viewedCard = globalDeck.cards.find((card) => card.id == Number(params.cardID));
  let localDate;
  let viewDialog = <></>;

  if (viewedCard) {
    if (viewedCard.content.date) {
      localDate = new Date(Number(viewedCard.content.date)).toLocaleDateString();
    }

    const browse = <>
      {
        Number(params.cardID) > 1 &&
        <div onClick={(e) => { navigate(`/card/${Number(params.cardID) - 1}`); e.stopPropagation() }}>
          <Browse type="prev" />
        </div>
      }
      {
        Number(params.cardID) < globalDeck.cards.length &&
        <div onClick={(e) => { navigate(`/card/${Number(params.cardID) + 1}`); e.stopPropagation() }}>
          <Browse type="next" />
        </div>
      }
    </>

    const tray = <div style={styles.tray}>
      <wired-card style={styles.button} onClick={() => { navigate('/') }} elevation={2}><Icon name='multi' />Home</wired-card>
      <wired-card style={styles.button} onClick={() => { navigate('/card') }} elevation={2}><Icon name='search' />Explore</wired-card>
    </div>

    viewDialog = <>
      <wired-dialog open onClick={() => navigate('/card')}>
        <Permalink />
        <div style={styles.focus}>
          <div style={styles.title}>{viewedCard.content.title}</div>
          <div style={styles.credit}>by {viewedCard.content.author}</div>
          <div style={styles.credit}>{localDate ? `${localDate}` : ''}</div>
          <img style={styles.image} src={viewedCard.content.image} />
          <div style={styles.description}>{viewedCard.content.description}</div>
          {browse}
          {tray}
        </div>
      </wired-dialog>
    </>
  }

  // Show All Cards Matching Filter
  const [filteredCards, setFilteredCards] = useState(globalDeck.cards)
  const shownCards = <div style={styles.cards}>
    {filteredCards.map((card) => {
      return <div key={`gallery-${card.id}`} onClick={() => navigate(`/card/${card.id}`)}>
        {CardFace(card)}
      </div>
    })}
  </div>

  return (
    <div>
      {shownCards}
      {viewedCard && viewDialog}
      <div style={styles.footer}>Card Gallery</div>
    </div>
  );
}

export function Permalink() {
  const url = `${window.location.origin}${window.location.pathname}`

  const copyPermalink = () => {
    let sharePermalink = document.getElementById('sharePermalink');
    if (sharePermalink) {
      sharePermalink.classList.remove('clickedLink');
      sharePermalink.classList.add('clickedLink');
      setTimeout(() => {
        sharePermalink.classList.remove('clickedLink');
      }, 250);
      try {
        window.navigator.clipboard.writeText(url);
      } catch (err) {
        console.error("Unable to Copy to Clipboard", err)
      }
    }
  }

  const styles: { [key: string]: Properties<string | number> } = {
    copybutton: {
      width: '100%',
      position: 'fixed',
      top: '0',
      left: '0',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    permalink: {
      padding: '0.25em 0.5em',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      textDecoration: 'underline',
      backgroundColor: 'white',
      borderRadius: '0 0 1em 1em',
    }
  }

  return (
    <div style={styles.copybutton}>
      <div id="sharePermalink" style={styles.permalink} onClick={copyPermalink}>
        <Icon name="copy" />
        {url}
      </div>
    </div>
  )
}