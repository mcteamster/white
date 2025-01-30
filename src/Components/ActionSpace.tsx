import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import type { Properties } from 'csstype';
import { Card, getCardByFocus } from '../Cards';
import { Icon } from './Icons';

export function ActionSpace(props: BoardProps<GameState>) {
  const focused: Card | undefined = getCardByFocus(props.G.cards, props.playerID);

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
      width: 'min(66vw, 50vh)',
      fontSize: '1.5em',
      fontWeight: 'bold',
    },
    image: {
      width: 'min(66vw, 50vh)',
      objectFit: 'cover',
    },
    description: {
      width: 'min(66vw, 50vh)',
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
      width: 'min(66vw, 50vh)',
      height: '100%',
      display: 'flex',
      flexWrap: 'wrap',
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    button: {
      height: '3em',
      width: '3em',
      minWidth: '30%',
      maxWidth: 'min(66vw, 50vh)',
      fontWeight: 'bold',
      display: 'flex',
      flexGrow: '1',
      justifyContent: 'center',
      alignItems: 'center',
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
        {focused.location != 'discard' && <wired-card style={{...styles.button, color: 'red'}} id="moveToDiscard" onClick={()=> {props.moves.moveCard(focused.id, "discard"); props.moves.focusCard(focused.id, false)}}><Icon name='discard'/>Discard</wired-card>}
        {/* {focused.location != 'deck' && <wired-card style={{...styles.button, color: 'black'}} id="moveToDeck" onClick={()=> {props.moves.moveCard(focused.id, "deck"); props.moves.focusCard(focused.id, false)}}><Icon name='return'/>Reshuffle</wired-card>} */}
        {focused.location != 'hand' && <wired-card style={{...styles.button, color: 'black'}} id="moveToHand" onClick={()=> {props.moves.moveCard(focused.id, "hand"); props.moves.focusCard(focused.id, false)}}><Icon name='take'/>Hand</wired-card>}
        {focused.location != 'table' && <wired-card style={{...styles.button, color: 'black'}} id="moveToTable" onClick={()=> {props.moves.moveCard(focused.id, "table"); props.moves.focusCard(focused.id, false)}}><Icon name='take'/>Table</wired-card>}
        {focused.location != 'pile' && <wired-card style={{...styles.button, color: 'black'}} id="moveToPile" onClick={()=> {props.moves.moveCard(focused.id, "pile"); props.moves.focusCard(focused.id, false)}}><Icon name='play'/>Pile</wired-card>}
      </div>
    }

    return (
      <wired-dialog open onClick={()=>{props.moves.focusCard(focused.id, false)}}>
        <div style={styles.focus} onClick={e => owned && e.stopPropagation()}>
          <div style={styles.title}>{focused.content.title}</div>
          <div style={styles.credit}>by {focused.content.author}</div>
          <div style={styles.credit}>{localDate ? `${localDate}` : ''}</div>
          <img style={styles.image} src={focused.content.image}/>
          <div style={styles.description}>{focused.content.description}</div>
          {tray}
        </div>
      </wired-dialog>
    );
  }
}