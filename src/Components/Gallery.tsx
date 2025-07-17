import { useNavigate, useParams } from "react-router";
import type { Properties } from 'csstype';
import { Browse, Icon } from './Icons';
import { startingDeck } from '../lib/clients';
import { useCallback, useContext, useEffect, useState } from "react";
import { Card, getAdjacentCard } from "../Cards";
import { HotkeysContext, ImageCacheType } from "../lib/contexts";
import { useWindowDimensions } from "../lib/hooks";
import { BLANK_IMAGE, decompressImage } from "../lib/images";
import { discordSdk } from "../lib/discord";

export function Gallery() {
  const navigate = useNavigate();
  const { hotkeys } = useContext(HotkeysContext);
  const { height } = useWindowDimensions();
  const [displayedCards, setDisplayedCards] = useState<Card[]>([]);
  const dimensions = useWindowDimensions();

  const styles: { [key: string]: Properties<string | number> } = {
    gallery: {
      width: '100%',
      minHeight: height,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cards: {
      width: '100%',
      padding: `${(discordSdk && dimensions.upright) ? '3.75em' : '1em'} 0 5em 0`,
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
      width: '3em',
      padding: '1em',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
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
      justifyContent: 'space-between',
      alignItems: 'center',
    },
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
    cardTitle: {
      fontSize: '1em',
      fontWeight: 'bold',
    },
    cardImage: {
      width: '4em',
      height: '4em',
    },
    cardCredit: {
      fontSize: '0.75em',
      textAlign: 'center',
    },
  }

  // Cache All Images from Global Deck
  const [imageCache, setImageCache] = useState<ImageCacheType>({});
  const dispatchImage = useCallback((cardImage: { id: number, value: string }) => {
    imageCache[cardImage.id] = cardImage.value;
    setImageCache(imageCache)
  }, [imageCache, setImageCache])

  useEffect(() => {
    startingDeck.cards.forEach((card: Card) => {
      if (card.id) {
        if (card.content.image?.startsWith('data:image/png;base64,')) { // Support PNG Data URIs
          dispatchImage({ id: card.id, value: card.content.image })
        } else if (card.content.image) { // RLE UTF-16 String
          decompressImage(card.content.image).then(res => {
            dispatchImage({ id: card.id, value: res });
          });
        }
      }
    })
    setTimeout(() => {
      setDisplayedCards([...startingDeck.cards]);
    }, 500)
  }, [setDisplayedCards, dispatchImage])

  const globalDeck = startingDeck;
  const params = useParams();
  const viewedCard = globalDeck.cards.find((card) => card.id == Number(params.cardID));
  let localDate;
  let viewDialog = <></>;

  if (viewedCard) {
    if (viewedCard.content.date) {
      localDate = new Date(Number(viewedCard.content.date)).toLocaleDateString();
    }

    const changeViewed = (direction: 'old' | 'new') => {
      const adjacentCard = getAdjacentCard(displayedCards, viewedCard.id, direction, null);
      if (adjacentCard) {
        navigate(`/card/${Number(adjacentCard.id)}`)
      }
    }

    if (hotkeys.left) {
      setTimeout(() => {
        changeViewed('old');
      }, 0)
    } else if (hotkeys.right) {
      setTimeout(() => {
        changeViewed('new');
      }, 0)
    } else if (hotkeys.escape) {
      setTimeout(() => {
        navigate('/card');
      }, 0)
    }

    const browse = <>
      {
        displayedCards.findIndex((card) => card.id == viewedCard.id) > 0 &&
        <div onClick={(e) => { changeViewed('old'); e.stopPropagation() }}>
          <Browse type="prev" />
        </div>
      }
      {
        displayedCards.findIndex((card) => card.id == viewedCard.id) < (displayedCards.length - 1) &&
        <div onClick={(e) => { changeViewed('new'); e.stopPropagation() }}>
          <Browse type="next" />
        </div>
      }
    </>

    viewDialog = <>
      <wired-dialog open onClick={(e) => { navigate('/card'); e.stopPropagation() }}>
        <Permalink />
        <div style={styles.focus}>
          <div style={styles.title}>{viewedCard.content.title}</div>
          <div style={styles.credit}>by {viewedCard.content.author}</div>
          <div style={styles.credit}>{localDate ? `${localDate}` : ''}</div>
          <img style={styles.image} src={imageCache[viewedCard.id]} />
          <div style={styles.description}>{viewedCard.content.description}</div>
          {browse}
        </div>
      </wired-dialog>
    </>
  }

  return (
    <div style={styles.gallery}>
      <div style={styles.cards}>
        {
          displayedCards.map((card: Card, i: number) => {
            let cardLocalDate;
            if (card.content.date) {
              cardLocalDate = new Date(Number(card.content.date)).toLocaleDateString();
            }

            return <wired-card style={styles.card} id={`gallery-${i + 1}`} key={`gallery-${card.id}`} onClick={(e) => { navigate(`/card/${card.id}`); e.stopPropagation() }}>
              {card.id != 0 && <img style={styles.cardImage} src={imageCache[card.id] || BLANK_IMAGE}></img>}
              <div style={styles.cardTitle}>{card.content.title}</div>
              <div style={styles.cardCredit}>{card.content.author && `${card.content.author}`}</div>
              <div style={styles.cardCredit}>{card.content.date && `${cardLocalDate}`}</div>
            </wired-card>
          })
        }
      </div>
      {viewedCard && viewDialog}
      <div style={styles.footer}>
        <div style={styles.button} onClick={() => { navigate('/') }}>
          <Icon name='copy' />
          Home
        </div>
        <Search allCards={globalDeck.cards} setDisplayedCards={setDisplayedCards} />
        <div style={styles.button} onClick={() => { document.getElementById(`gallery-${displayedCards.length}`)?.scrollIntoView() }}>
          {displayedCards.length}<br></br>
          Cards
        </div>
      </div>
    </div>
  );
}

interface SearchProps {
  allCards: Card[];
  setDisplayedCards: (cards: Card[]) => void;
}

export function Search(props: SearchProps) {
  const styles: { [key: string]: Properties<string | number> } = {
    search: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchbox: {
      fontFamily: "'Patrick Hand SC', Arial, Helvetica, sans-serif",
      fontSize: "1.25em",
      width: '7.25em',
      margin: '0.25em',
      border: 'none',
      textAlign: 'left',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }

  const searchCards = useCallback((query: string): Card[] => {
    return props.allCards.filter((card) => {
      if (card.id == Number(query)) {
        return true
      }
      if (card.content.title.toUpperCase().includes(query.toUpperCase())) {
        return true
      }
      if (card.content.author?.toUpperCase().includes(query.toUpperCase())) {
        return true
      }
      if (card.content.description.toUpperCase().includes(query.toUpperCase())) {
        return true
      }
      return false
    });
  }, [props.allCards])

  const clearSearch = useCallback(() => {
    const queryInput = document.querySelector('#searchInput') as HTMLInputElement
    if (queryInput) {
      queryInput.value = '';
      props.setDisplayedCards(props.allCards);
    }
  }, [props])

  return <div style={styles.search}>
    <Icon name="search" />
    <input type='text' style={styles.searchbox} id="searchInput" placeholder="Search Card Gallery" onChange={(e) => {
      const query = e.target.value;
      props.setDisplayedCards(searchCards(query));
    }} />
    <div onClick={clearSearch}>
      <Icon name="exit" />
    </div>
  </div>
}

export function Permalink() {
  const url = `${import.meta.env.VITE_ORIGIN}${window.location.pathname}`
  const dimensions = useWindowDimensions();

  const copyPermalink = () => {
    const sharePermalink = document.getElementById('sharePermalink');
    if (sharePermalink) {
      sharePermalink.classList.remove('clickedLink');
      sharePermalink.classList.add('clickedLink');
      setTimeout(() => {
        sharePermalink.classList.remove('clickedLink');
      }, 250);
      try {
        window.navigator.clipboard.writeText(url);
      } catch (err) {
        console.warn("Unable to Copy to Clipboard", err)
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
      height: (discordSdk && dimensions.upright) ? '4.75em' : '',
      padding: '0.25em 0.5em',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'flex-end',
      textDecoration: 'underline',
      backgroundColor: 'white',
      borderRadius: '0 0 1em 1em',
    }
  }

  return (
    <div style={styles.copybutton}>
      <div id="sharePermalink" style={styles.permalink} onClick={(e) => { copyPermalink(); e.stopPropagation() }}>
        <Icon name="copy" />
        {url}
      </div>
    </div>
  )
}