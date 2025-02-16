import type { BoardProps } from 'boardgame.io/react';
import QRCode from "react-qr-code";
import type { GameState } from '../Game.ts'
import type { Properties } from 'csstype';
import { CardFace } from './CardFace.tsx';
import { getCardsByLocation } from '../Cards';
import { Icon } from './Icons';
import { useState } from 'react';

export function Pile(props: BoardProps<GameState>) {
  const pile = getCardsByLocation(props.G.cards, "pile").sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Newest to Oldest

  const styles: { [key: string]: Properties<string | number> } = {
    pile: {
      width: '100%',
      height: '100%',
      gridRow: '2 / 7',
      gridColumn: '5',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
  };

  return (
    <div style={styles.pile}>
      <div onClick={() => props.moves.focusCard(pile[0].id, true)}>
        {pile.length > 0 ?
          <CardFace {...pile[0]} /> :
          <CardFace {...{
            "id": 0,
            "content": {
              "title": "Blank White Cards",
              "author": "a game by mcteamster",
              "description": "Pick up cards. Do what they say. Create your own!",
            },
            "location": "pile",
            "focused": [],
          }} />}
      </div>
    </div>
  );
}

export function Header(props: BoardProps<GameState>) {
  const [showShare, setShowShare] = useState(false);

  const playerName = props.isMultiplayer && props.matchData?.find((player) => player.id == Number(props.playerID))?.name?.toUpperCase() || ""

  const styles: { [key: string]: Properties<string | number> } = {
    header: {
      width: '100%',
      height: '2em',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '10',
      backgroundColor: 'white',
      borderBottom: '0.5pt solid black',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    item: {
      display: 'flex',
      flexDirection: 'row',
      padding: '0 0.25em',
    },
    displayname: {
      fontSize: '1em',
    },
    match: {
      fontSize: '1.25em',
    },
  };

  return (
    <>
      <div style={styles.header}>
        <div style={{ ...styles.item, ...styles.match }} onClick={ () => setShowShare(true) }><Icon name='copy' />&nbsp;{props.matchID !== 'default' ? `${props.matchID}` : "Blank White Cards"}</div>
        <div style={{ ...styles.item, ...styles.displayname }}>{playerName}{props.matchID !== 'default' && <Icon name='single' />}</div>
      </div>
      {showShare && <ShareRoom matchID={props.matchID} setShowShare={setShowShare} />}
    </>

  )
}

export function ShareRoom(props: { matchID: string, setShowShare: React.Dispatch<React.SetStateAction<boolean>> }) {
  const url = `${window.location.origin}/${props.matchID != 'default' ? props.matchID : ''}`;

  const copyToClipboard = (room: string) => {
    if (room == 'default') {
      room = 'app'
    }
    const shareUrl = document.getElementById('shareUrl');
    if (shareUrl) {
      shareUrl.classList.remove('clickedLink');
      shareUrl.classList.add('clickedLink');
      setTimeout(() => {
        shareUrl.classList.remove('clickedLink');
      }, 250);
      try {
        window.navigator.clipboard.writeText(`${window.location.origin}/${room}`);
      } catch (err) {
        console.error("Unable to Copy to Clipboard", err)
      }
    }
  }

  const styles: { [key: string]: Properties<string | number> } = {
    dialog: {
      width: '100%',
      height: '2em',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '9',
      backgroundColor: 'white',
      borderBottom: '0.5pt solid black',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    qr: {
      height: "auto",
      maxWidth: "100%",
      width: "100%",
    },
    copy: {
      display: 'flex',
      justifyContent: 'center',
      alignContent: 'center',
      flexDirection: 'column',
      textAlign: 'center',
    },
    text: {
      margin: '0.5em',
    }
  };

  return (
    <wired-dialog open style={styles.dialog} onClick={ () => props.setShowShare(false) }>
      <div style={styles.copy} onClick={(e) => { copyToClipboard(props.matchID); e.stopPropagation() }}>
        <div style={styles.text}>Scan to Share / Tap to Copy</div>
        <QRCode size={256} style={styles.qr} value={url} viewBox={`0 0 256 256`} />
        <div id="shareUrl" style={styles.text}><u>{url}</u></div>
      </div>
  </wired-dialog>
  )
}

export function CommonSpace(props: BoardProps<GameState>) {
  return (
    <>
      <Header {...props} />
      <Pile {...props} />
    </>
  );
}