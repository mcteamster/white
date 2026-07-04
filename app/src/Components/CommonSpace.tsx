import type { BoardProps } from '@mcteamster/white-engine/react';
import QRCode from "react-qr-code";
import type { GameState } from '@mcteamster/white-core'
import type { Properties } from 'csstype';
import { CardFace } from './CardFace.tsx';
import { getCardsByLocation, getCardsByOwner } from '@mcteamster/white-core';
import { Icon } from './Icons';
import { useCallback, useContext, useState } from 'react';
import { useWindowDimensions } from '../lib/hooks.ts';
import { FocusContext } from '../lib/contexts.ts';
import { discordSdk } from '../lib/discord.ts';
import { Likes } from './Focus.tsx';
import { Calculator, formatScore } from './Calculator.tsx';

// Helper to read a player's score from the PluginPlayer data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getPlayerScore = (plugins: any, playerID: string): number => {
  return plugins?.player?.data?.players?.[playerID]?.score ?? 0;
};


export function Pile(props: BoardProps<GameState>) {
  const { focus, setFocus } = useContext(FocusContext);
  const focusCard = useCallback(((id: number, focusState: boolean) => {
    if (focus?.id != id && focusState == true) {
      setFocus({ id });
    } else {
      setFocus({});
    }
  }), [focus, setFocus]);
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
      <div onClick={() => { 
        if (pile.length > 0) { 
          focusCard(pile[0].id, true) 
        }
      }} style={{ position: 'relative' }}>
        {pile.length > 0 && (
          <div style={{ position: 'absolute', bottom: '1.25em', right: '1.75em', zIndex: 10 }}>
            <Likes card={pile[0]} likeCard={props.moves.likeCard} matchId={props.matchID} />
          </div>
        )}
        {pile.length > 0 ?
          <CardFace {...pile[0]} /> :
          <CardFace {...{
            "id": 0,
            "content": {
              "title": "",
              "author": "",
              "description": "",
            },
            "location": "pile",
          }} />}
      </div>
    </div>
  );
}

export function Players(props: BoardProps<GameState>) {
  const dimensions = useWindowDimensions();
  const { focus, setFocus } = useContext(FocusContext);
  const focusCard = useCallback(((id: number, focusState: boolean) => {
    if (focus?.id != id && focusState == true) {
      setFocus({ id });
    } else {
      setFocus({});
    }
  }), [focus, setFocus]);
  const initialOpenPlayers: number[] = [];
  if (props.isMultiplayer && props.matchData) {
    if (!dimensions.upright) {
      props.matchData?.forEach((player) => {
        initialOpenPlayers.push(player.id)
      });
    }
  } 
  const [openPlayers, setOpenPlayers] = useState<number[]>(initialOpenPlayers); // List of players with open table trays
  const [editingScore, setEditingScore] = useState<number | null>(null); // playerID being score-edited
  const styles: { [key: string]: Properties<string | number> } = {
    players: {
      maxWidth: '100vw',
      maxHeight: '60vh',
      overflowY: 'scroll',
      scrollbarWidth: 'none',
      position: 'fixed',
      top: (discordSdk && dimensions.upright) ? '4.75em' : '4em',
      right: '0',
      zIndex: '20',
      borderRadius: '0 0 0 1em',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
    },
    avatarBox: {
      maxWidth: '50em',
      display: 'flex',
      flexDirection: 'row-reverse',
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
    avatar: {
      height: '3em',
      minHeight: '3em',
      width: '3em',
      minWidth: '3em',
      margin: '0.5em 0.25em',
      backgroundColor: '#eee',
      borderRadius: '0.5em',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    tableBox: {
      maxHeight: '60vh',
      overflowY: 'scroll',
      scrollbarWidth: 'none',
      margin: '0.25em',
      borderRadius: '0.5em',
      zIndex: '20',
      position: (dimensions.upright) ? 'fixed' : 'relative',
      right: (dimensions.upright) ? '5em' : undefined,
      backgroundColor: (dimensions.upright) ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    stats: {
      fontSize: '0.8em',
    },
    score: {
      fontSize: '1em',
      lineHeight: 1,
      fontWeight: 'bold',
    },
  }

  const toggleOpenPlayers = (id: number) => {
    if (openPlayers.includes(id)) {
      setOpenPlayers(openPlayers.filter((player) => player != id));
    } else if (dimensions.upright) {
      setOpenPlayers([id]);
    } else {
      setOpenPlayers([...openPlayers, id]);
    }
  }

  const playerAvatars = props.matchData ? props.matchData.map((player, i) => {
    if (player.isConnected && player.name && player.id != Number(props.playerID)) { 
      const playerTable = getCardsByLocation(getCardsByOwner(props.G.cards, String(player.id)), 'table').sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // Oldest to Newest
      const score = getPlayerScore(props.plugins, String(player.id));
      
      return (
        <div key={`player-avatar-${i}`} style={styles.avatarBox}>
          <wired-card style={styles.avatar} onClick={() => { if (playerTable.length > 0) { toggleOpenPlayers(player.id) }}}>
            {(player.name).slice(0, 6)}{(player.name.length > 6) && '.'}
            <div style={styles.score}>
              <span
                style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                onClick={(e) => { e.stopPropagation(); setEditingScore(player.id); }}
              >{formatScore(score)}</span>
            </div>
          </wired-card>
          {(playerTable.length > 0) && <span style={styles.stats}>{(!openPlayers.includes(player.id)) ? '<' : '>'}</span>}
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
      {editingScore !== null && (
        <Calculator
          initialValue={getPlayerScore(props.plugins, String(editingScore))}
          label={props.matchData?.find(p => p.id === editingScore)?.name}
          onConfirm={(val) => { props.moves.setScore(String(editingScore), val, props.matchData?.find(p => p.id === Number(props.playerID))?.name, props.matchData?.find(p => p.id === editingScore)?.name); setEditingScore(null); }}
          onCancel={() => setEditingScore(null)}
        />
      )}
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
  const [editingMyScore, setEditingMyScore] = useState(false);
  const dimensions = useWindowDimensions();

  const playerName = props.isMultiplayer && props.matchData?.find((player) => player.id == Number(props.playerID))?.name?.toUpperCase() || ""
  const myScore = getPlayerScore(props.plugins, props.playerID || '0');

  const styles: { [key: string]: Properties<string | number> } = {
    header: {
      width: '100%',
      height: (discordSdk && dimensions.upright) ? '4.75em' : '2em',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '50',
      backgroundColor: 'white',
      borderBottom: '0.5pt solid black',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: (discordSdk && dimensions.upright) ? 'flex-end' : 'center',
    },
    item: {
      display: 'flex',
      flexDirection: 'row',
      padding: '0 0.25em',
    },
    match: {
      fontSize: '1.25em',
    },
  };

  return (
    <>
      <div style={styles.header}>
        <div style={{ ...styles.item, ...styles.match }} onClick={ () => setShowShare(true) }><Icon name='copy' />&nbsp;{props.matchID !== 'default' ? `${props.matchID}` : "Blank White Cards"}</div>
        {props.isMultiplayer && props.matchID !== 'default' && (
          <div style={{ ...styles.item, fontSize: '1em', paddingRight: '0.5em' }}>
            {playerName && (editingMyScore ? (
              <Calculator
                initialValue={myScore}
                label={playerName || undefined}
                onConfirm={(val) => { props.moves.setScore(props.playerID || '0', val, playerName, playerName); setEditingMyScore(false); }}
                onCancel={() => setEditingMyScore(false)}
              />
            ) : (
              <>{playerName}&nbsp;<span
                style={{ fontVariantNumeric: 'tabular-nums', cursor: 'pointer', textDecoration: 'underline dotted' }}
                onClick={(e) => { e.stopPropagation(); setEditingMyScore(true); }}
              >{formatScore(myScore)} pts</span></>
            ))}
          </div>
        )}
      </div>
      {/* Player tray notch — people icon + count + toggle, top-right */}
      {props.isMultiplayer && props.matchID !== 'default' && (props.matchData?.filter(p => p.isConnected).length ?? 0) > 1 && (
        <div style={{
          position: 'fixed',
          top: (discordSdk && dimensions.upright) ? '4.75em' : '2em',
          right: '0',
          zIndex: 40,
          cursor: 'pointer',
        }} onClick={() => { props.setShowPlayers(!props.showPlayers) }}>
          <div style={{
            backgroundColor: 'white',
            padding: '0.25em 0.5em',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '0.25em',
            borderRadius: '0 0 0 1em',
            border: '1px solid #ccc',
            borderTop: '1px solid black',
            borderRight: 'none',
            userSelect: 'none' as const,
            fontSize: '0.9em',
          }}>
            {props.matchData?.filter(p => p.isConnected).length}
            <Icon name='multi' />
          </div>
        </div>
      )}
      {showShare && <ShareRoom matchID={props.matchID} setShowShare={setShowShare} />}
    </>
  )
}

export function ShareRoom(props: { matchID: string, setShowShare: React.Dispatch<React.SetStateAction<boolean>> }) {
  const url = `${import.meta.env.VITE_ORIGIN}/${props.matchID != 'default' ? props.matchID : ''}`;

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
        window.navigator.clipboard.writeText(`${import.meta.env.VITE_ORIGIN}/${room}`);
      } catch (err) {
        console.warn("Unable to Copy to Clipboard", err)
      }
    }
  }

  const styles: { [key: string]: Properties<string | number> } = {
    dialog: {
      width: '100%',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '40',
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

interface CommonSpaceProps extends BoardProps<GameState> {
  showPlayers?: boolean;
  setShowPlayers?: React.Dispatch<React.SetStateAction<boolean>>;
}

export function CommonSpace(props: CommonSpaceProps) {
  const dimensions = useWindowDimensions();
  const [localShowPlayers, setLocalShowPlayers] = useState(!(dimensions.upright));
  const showPlayers = props.showPlayers ?? localShowPlayers;
  const setShowPlayers = props.setShowPlayers ?? setLocalShowPlayers;

  return (
    <>
      <Header {...props} showPlayers={showPlayers} setShowPlayers={setShowPlayers} />
      { props.isMultiplayer && showPlayers && <Players {...props} /> }
      <Pile {...props} />
    </>
  );
}