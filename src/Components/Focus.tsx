import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import type { Properties } from 'csstype';
import { Card, getAdjacentCard, getCardById } from '../Cards';
import { Icon, Browse } from './Icons';
import { useContext, useState } from 'react';
import { FocusContext, HotkeysContext } from '../lib/contexts.ts';
import { useFocus } from '../lib/hooks.ts';

export function Focus(props: BoardProps<GameState>) {
  const { focus, setFocus } = useContext(FocusContext);
  const focusCard = (id: number, focusState: boolean) => {
    useFocus(focus, setFocus, id, focusState);
  }
  let focused: Card | undefined;
  if (focus?.id) {
    focused = getCardById(props.G.cards, focus?.id)
  };
  const { hotkeys } = useContext(HotkeysContext);
  const [sendCardMode, setSendCardMode] = useState(false);

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
    },
    image: {
      width: 'min(65vw, 45vh)',
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
      minWidth: '22.5%',
      maxWidth: 'min(70vw, 45vh)',
      margin: '0.1em',
      borderRadius: '1em',
      display: 'flex',
      flexGrow: '1',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#333',
      backgroundColor: '#eee'
    },
    sendmenu: {
      height: '60vh',
      width: '90vw',
      maxWidth: '40em',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sendlist: {
      maxHeight: '40vh',
      overflowY: 'scroll',
    },
    sendbutton: {
      height: '3em',
      width: '15em',
      margin: '0.5em',
      borderRadius: '1em',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#333',
      backgroundColor: '#eee'
    }
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
        {<wired-card style={{ ...styles.button, color: props.isMultiplayer ? undefined : 'grey' }} id="sendButton" onClick={() => { if (props.isMultiplayer) { setSendCardMode(true) } }}><Icon name='send' />Send</wired-card>}
        {<wired-card style={{ ...styles.button }} id="returnButton" onClick={() => { props.moves.moveCard(focused.id, "deck"); focusCard(focused.id, false) }}><Icon name='shuffle' />Reshuffle</wired-card>}
        {<wired-card style={{ ...styles.button, color: 'red' }} id="discardButton" onClick={() => { props.moves.moveCard(focused.id, "discard"); focusCard(focused.id, false) }}><Icon name='discard' />Discard</wired-card>}
        {<wired-card style={{ ...styles.button }} id="handButton" onClick={() => { props.moves.moveCard(focused.id, "hand"); focusCard(focused.id, false) }}><Icon name='take' />Hand</wired-card>}
        {<wired-card style={{ ...styles.button }} id="pileButton" onClick={() => { props.moves.moveCard(focused.id, "pile"); focusCard(focused.id, false) }}><Icon name='pile' />Pile</wired-card>}
        {<wired-card style={{ ...styles.button }} id="tableButton" onClick={() => { props.moves.moveCard(focused.id, "table"); focusCard(focused.id, false) }}><Icon name='display' />Table</wired-card>}
      </div>
    }

    const changeFocus = (direction: 'prev' | 'next') => {
      const adjacentCard = getAdjacentCard(props.G.cards, focused.id, direction)
      if (adjacentCard) {
        focusCard(adjacentCard.id, true);
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
        focusCard(0, false);
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
            focusCard(adjacentCard.id, true);
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
            focusCard(adjacentCard.id, true);
          } else {
            unfocusCards();
          }
        }, 0)
      } else {
        unfocusCards();
      }
    }

    const sendMenu = <wired-dialog open={sendCardMode === true || undefined}>
      <div style={styles.sendmenu} onClick={(e) => e.stopPropagation()}>
        <div>
          <div style={styles.title}>Send to Another Player</div>
          <div>Card will be placed on their Table</div>
        </div>
        <wired-card>
          <div>Connected Players</div>
          <div style={styles.sendlist}>
            {props.matchData?.map((player) => {
              if (player.isConnected && player.name && player.id != Number(props.playerID)) {
                return (
                  <wired-card style={styles.sendbutton} onClick={() => { props.moves.moveCard(focused.id, "table", String(player.id)); setSendCardMode(false); focusCard(focused.id, false) }}>
                    {player.name}
                  </wired-card>
                )
              }
            })}
          </div>
        </wired-card>
        <wired-card style={{ ...styles.sendbutton }} id="backButton" onClick={() => { setSendCardMode(false) }}><Icon name='back' />Back</wired-card>
      </div>
    </wired-dialog>

    return (
      <wired-dialog open onClick={() => { focusCard(focused.id, false) }}>
        <div style={styles.focus} onClick={e => owned && e.stopPropagation()}>
          <div style={styles.title}>{focused.content.title}</div>
          <div style={styles.credit}>by {focused.content.author}</div>
          <div style={styles.credit}>{localDate ? `${localDate}` : ''}</div>
          <img style={styles.image} src={focused.content.image} />
          <div style={styles.description}>{focused.content.description}</div>
          {tray}
          {browse}
          {sendMenu}
        </div>
      </wired-dialog>
    );
  }
}