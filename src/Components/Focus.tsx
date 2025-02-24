import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import type { Properties } from 'csstype';
import { Card, getAdjacentCard, getCardByFocus } from '../Cards';
import { Icon, Browse } from './Icons';
import { useContext } from 'react';
import { HotkeysContext } from '../lib/contexts.ts';

export function Focus(props: BoardProps<GameState>) {
  const focused: Card | undefined = getCardByFocus(props.G.cards, props.playerID);
  const { hotkeys } = useContext(HotkeysContext);

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

  if (focused) {
    let localDate;
    if (focused.content.date) {
      localDate = new Date(Number(focused.content.date)).toLocaleDateString();
    }
    const owned = focused.owner == props.playerID;
    let tray = <></>
    if (owned) {
      tray = <div style={styles.tray}>
        {<wired-card style={{ ...styles.button }} id="returnButton" onClick={() => { props.moves.moveCard(focused.id, "deck"); props.moves.focusCard(focused.id, false) }}><Icon name='shuffle' />Deck</wired-card>}
        {<wired-card style={{ ...styles.button, color: 'red' }} id="discardButton" onClick={() => { props.moves.moveCard(focused.id, "discard"); props.moves.focusCard(focused.id, false) }}><Icon name='discard' />Discard</wired-card>}
        {<wired-card style={{ ...styles.button, color: 'lightgrey' }} id="sendButton" onClick={() => { /* props.moves.moveCard(focused.id, "hand", props.playerID); props.moves.focusCard(focused.id, false) */ }}><Icon name='send' />Send</wired-card>}
        {<wired-card style={{ ...styles.button }} id="handButton" onClick={() => { props.moves.moveCard(focused.id, "hand"); props.moves.focusCard(focused.id, false) }}><Icon name='take' />Hand</wired-card>}
        {<wired-card style={{ ...styles.button }} id="pileButton" onClick={() => { props.moves.moveCard(focused.id, "pile"); props.moves.focusCard(focused.id, false) }}><Icon name='pile' />Pile</wired-card>}
        {<wired-card style={{ ...styles.button }} id="tableButton" onClick={() => { props.moves.moveCard(focused.id, "table"); props.moves.focusCard(focused.id, false) }}><Icon name='display' />Table</wired-card>}
      </div>
    }

    const changeFocus = (direction: 'prev' | 'next') => {
      const adjacentCard = getAdjacentCard(props.G.cards, focused.id, direction)
      if (adjacentCard) {
        props.moves.focusCard(adjacentCard.id, true);
      }
    }

    const browse = <>
      {
        getAdjacentCard(props.G.cards, focused.id, 'prev') &&
        <div onClick={(e) => { changeFocus('prev'); e.stopPropagation() }}>
          <Browse type="prev" />
        </div>
      }
      {
        getAdjacentCard(props.G.cards, focused.id, 'next') &&
        <div onClick={(e) => { changeFocus('next'); e.stopPropagation() }}>
          <Browse type="next" />
        </div>
      }
    </>

    const unfocusCards = () => {
      setTimeout(() => {
        props.moves.focusCard(0, false);
      }, 0)
    }

    // Hotkeys
    if (hotkeys.escape) {
      unfocusCards();
    } else if (hotkeys.left && focused.id) {
      setTimeout(() => {
        changeFocus('prev');
      }, 0)
    } else if (hotkeys.right && focused.id) {
      setTimeout(() => {
        changeFocus('next');
      }, 0)
    } else if (owned && hotkeys.up) {
      if (focused.location != "table") {
        setTimeout(() => {
          const adjacentCard = getAdjacentCard(props.G.cards, focused.id, 'prev') || getAdjacentCard(props.G.cards, focused.id, 'next');
          props.moves.moveCard(focused.id, "table");
          if (adjacentCard) {
            props.moves.focusCard(adjacentCard.id, true);
          } else {
            unfocusCards();
          }
        }, 0)
      } else {
        unfocusCards();
      }
    } else if (owned && hotkeys.down) {
      if (focused.location != "hand") {
        setTimeout(() => {
          const adjacentCard = getAdjacentCard(props.G.cards, focused.id, 'prev') || getAdjacentCard(props.G.cards, focused.id, 'next');
          props.moves.moveCard(focused.id, "hand");
          if (adjacentCard) {
            props.moves.focusCard(adjacentCard.id, true);
          } else {
            unfocusCards();
          }
        }, 0)
      } else {
        unfocusCards();
      }
    }

    return (
      <wired-dialog open onClick={() => { props.moves.focusCard(focused.id, false) }}>
        <div style={styles.focus} onClick={e => owned && e.stopPropagation()}>
          <div style={styles.title}>{focused.content.title}</div>
          <div style={styles.credit}>by {focused.content.author}</div>
          <div style={styles.credit}>{localDate ? `${localDate}` : ''}</div>
          <img style={styles.image} src={focused.content.image} />
          <div style={styles.description}>{focused.content.description}</div>
          {tray}
          {browse}
        </div>
      </wired-dialog>
    );
  }
}