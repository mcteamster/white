import type { BoardProps } from 'boardgame.io/react';
import QRCode from "react-qr-code";
import type { GameState } from '../Game.ts'
import type { Properties } from 'csstype';
import { CardFace } from './CardFace.tsx';
import { getCardsByLocation, getCardsByOwner } from '../Cards';
import { Icon } from './Icons';
import { useCallback, useState } from 'react';
import { useFocus, useWindowDimensions } from '../lib/hooks.ts';

export function Pile(props: BoardProps<GameState>) {
  const focusCard = useCallback(useFocus, []);
  const pile = getCardsByLocation(props.G.cards, "pile").sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Newest to Oldest

  const styles: { [key: string]: Properties<string | number> } = {
    pile: {
      width: '100%',
      height: '100%',
      gridRow: '2 / 7',
      gridColumn: '2 / 9',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
  };

  return (
    <div style={styles.pile}>
      <div onClick={() => focusCard(pile[0].id, true)}>
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
          }} />}
      </div>
    </div>
  );
}

export function Players(props: BoardProps<GameState>) {
  const dimensions = useWindowDimensions();
  const focusCard = useCallback(useFocus, []);
  const initialOpenPlayers: number[] = [];
  if (props.isMultiplayer && props.matchData) {
    if ((dimensions.width/dimensions.height) > (2/3)) {
      props.matchData?.forEach((player) => initialOpenPlayers.push(player.id));
    }
  } 
  const [openPlayers, setOpenPlayers] = useState<number[]>(initialOpenPlayers); // List of players with open table trays
  const styles: { [key: string]: Properties<string | number> } = {
    players: {
      width: '100vw',
      height: '70vh',
      position: 'fixed',
      top: '2.5em',
      right: '0',
      zIndex: '4',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
    },
    avatarBox: {
      width: '100vw',
      position: 'relative',
      right: '-0.5em',
      display: 'flex',
      flexDirection: 'row-reverse',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    avatar: {
      height: '3em',
      minHeight: '3em',
      width: '3em',
      minWidth: '3em',
      margin: '0.25em 0',
      backgroundColor: '#eee',
      borderRadius: '0.5em',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    tableBox: {
      padding: '0 0.25em',
      borderRadius: '0.5em',
      position: 'absolute',
      right: '5.5em',
      zIndex: '5',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    stats: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }

  const toggleOpenPlayers = (id: number) => {
    if (openPlayers.includes(id)) {
      setOpenPlayers(openPlayers.filter((player) => player != id));
    } else if ((dimensions.width/dimensions.height) < (2/3)) {
      setOpenPlayers([id]);
    } else {
      setOpenPlayers([...openPlayers, id]);
    }
  }

  const playerAvatars = props.matchData ? props.matchData.map((player, i) => {
    if (player.isConnected && player.name && player.id != Number(props.playerID)) { 
      const playerTable = getCardsByLocation(getCardsByOwner(props.G.cards, String(player.id)), 'table').sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // Oldest to Newest
      
      return (
        <div key={`player-avatar-${i}`} style={styles.avatarBox}>
          <wired-card style={styles.avatar} onClick={() => { if (playerTable.length > 0) { toggleOpenPlayers(player.id) }}}>
              <div style={styles.stats}>
                {(playerTable.length > 0) && ((!openPlayers.includes(player.id)) ? <Icon name='prev' /> : <Icon name='next' />)}
                <Icon name='single' />
              </div>
            {(player.name).slice(0, 6)}{(player.name.length > 6) && '...'}      
          </wired-card>
          {
            openPlayers.includes(player.id) &&
            <div style={styles.tableBox}>
              {playerTable.map((tableCard, j) => {
                return <div key={`player-avatar-${i}-table-${j}`} onClick={() => focusCard(tableCard.id, true)}>
                  <CardFace {...tableCard} />
                </div>
              })}
            </div>
          }
        </div>
      )
    } else {
      return undefined
    }
  }) : <></>;

  return (
    <div style={styles.players}>
      {playerAvatars}
    </div>
  )
}

interface HeaderProps extends BoardProps<GameState> {
  showPlayers: boolean;
  setShowPlayers: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Header(props: HeaderProps) {
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
        <div style={{ ...styles.item, ...styles.displayname }} onClick={() => { props.setShowPlayers(!props.showPlayers) }}>{playerName}&nbsp;{props.matchID !== 'default' && <Icon name='multi' />}</div>
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
  const dimensions = useWindowDimensions();
  const [showPlayers, setShowPlayers] = useState((dimensions.width/dimensions.height) > (2/3));

  return (
    <>
      <Header {...props} showPlayers={showPlayers} setShowPlayers={setShowPlayers} />
      { props.isMultiplayer && showPlayers && <Players {...props} /> }
      <Pile {...props} />
    </>
  );
}