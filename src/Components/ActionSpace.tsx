import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import type { Properties } from 'csstype';
import { Card, getCardByFocus } from '../Cards';

export function ActionSpace(props: BoardProps<GameState>) {
  const focused: Card | undefined = getCardByFocus(props.G.cards);

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
      width: 'min(66vw, 66vh)',
      fontSize: '1.5em',
      fontWeight: 'bold',
    },
    image: {
      width: 'min(66vw, 66vh)',
      height: 'min(66vw, 66vh)',
      objectFit: 'cover',
    },
    description: {
      width: 'min(66vw, 66vh)',
      height: '140px',
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
    tray: {
      width: 'min(66vw, 66vh)',
      maxWidth: 'min(66vw, 66vh)',
      height: '100%',
      display: 'flex',
      flexWrap: 'wrap',
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    button: {
      height: '3em',
      minWidth: '30%',
      maxWidth: 'min(66vw, 66vh)',
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
    let owned = focused.owner == props.playerID;
    let tray = <></>
    if (owned) {
      tray = <div style={styles.tray}>
        {focused.location != 'discard' && <wired-card style={{...styles.button, color: 'red'}} id="moveToDiscard" onClick={()=> {props.moves.moveCard(focused.id, "discard"); props.moves.focusCard(focused.id, false)}}>Discard</wired-card>}
        {focused.location != 'deck' && <wired-card style={{...styles.button, color: 'black'}} id="moveToDeck" onClick={()=> {props.moves.moveCard(focused.id, "deck"); props.moves.focusCard(focused.id, false)}}>Return to Deck</wired-card>}
        {focused.location != 'hand' && <wired-card style={{...styles.button, color: 'black'}} id="moveToHand" onClick={()=> {props.moves.moveCard(focused.id, "hand"); props.moves.focusCard(focused.id, false)}}>Move to Hand</wired-card>}
        {focused.location != 'table' && <wired-card style={{...styles.button, color: 'black'}} id="moveToTable" onClick={()=> {props.moves.moveCard(focused.id, "table"); props.moves.focusCard(focused.id, false)}}>Play to Table</wired-card>}
        {focused.location != 'pile' && <wired-card style={{...styles.button, color: 'black'}} id="moveToPile" onClick={()=> {props.moves.moveCard(focused.id, "pile"); props.moves.focusCard(focused.id, false)}}>Play on Pile</wired-card>}
      </div>
    }

    return (
      <wired-dialog elevation={1} open onClick={()=>{props.moves.focusCard(focused.id, false)}}>
        <div style={styles.focus} onClick={e => e.stopPropagation()}>
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