import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import { Create } from './Create.tsx';
import { Focus } from './Focus.tsx';
import type { Properties } from 'csstype';
import { getCardsByLocation } from '../Cards';
import { Icon } from './Icons';
import { useState, useEffect } from 'react';
import { sketchpad } from '../Canvas.ts';

// Sketchpad
sketchpad.recordStrokes = true;

export function Toolbar({ G, moves, mode, setMode }: BoardProps<GameState> & { mode: string, setMode: Function }) {
  const deck = getCardsByLocation(G.cards, "deck");
  const pile = getCardsByLocation(G.cards, "pile");
  const discard = getCardsByLocation(G.cards, "discard");

  const styles: { [key: string]: Properties<string | number> } = {
    toolbar: {
      width: '100%',
      height: '7em',
      position: 'fixed',
      bottom: '0',
      left: '0',
      zIndex: '10',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    button: {
      height: '3em',
      width: '5.5em',
      margin: '0.25em',
      fontWeight: 'bold',
      textAlign: 'center',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'white',
      borderRadius: '1em',
    },
    active: {
      backgroundColor: '#ddd',
    }
  };

  useEffect(() => {
    const create = document.getElementById('create');
    if (mode === 'create') {
      create && (create.style.display = 'flex');
    } else {
      create && (create.style.display = 'none');
    }
  }, [mode])

  let toolset = <></>
  if (mode === 'play') {
    toolset = <>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('options') }} elevation={2}><Icon name='settings' />Options</wired-card>
      <wired-card style={{ ...styles.button, ...styles.active }} onClick={() => { moves.pickupCard(true) }} elevation={2}>{deck.length > 0 ? <Icon name='play' /> : <Icon name='shuffle' />}{deck.length > 0 ? 'Pickup' : `Reshuffle (${pile.length + discard.length})`}</wired-card>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('create') }} elevation={2}><Icon name='create' />Create</wired-card>
    </>
  } else if (mode === 'create') {
    toolset = <>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('play') }} elevation={2}><Icon name='exit' />Close</wired-card>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('play') }} elevation={2}><Icon name='undo' />Undo</wired-card>
      <wired-card style={{ ...styles.button, ...styles.active }} onClick={() => { setMode('create') }} elevation={2}><Icon name='done' />Commit</wired-card>
    </>
  } else if (mode === 'options') {
    toolset = <>
      <wired-card style={{ ...styles.button, ...styles.active }} onClick={() => { setMode('play') }} elevation={2}><Icon name='done' />Save</wired-card>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('play') }} elevation={2}><Icon name='exit' />Cancel</wired-card>
    </>
  }

  return (
    <div style={styles.toolbar} >
      {toolset}
    </div>
  );
}

export function ActionSpace(props: BoardProps<GameState>) {
  const [mode, setMode] = useState('play');
  return (
    <>
      <Focus {...props} />
      <Create {...props} />
      <Toolbar {...props} mode={mode} setMode={setMode} />
    </>
  )
}