import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import { Finalise } from './Finalise.tsx';
import { Focus } from './Focus.tsx';
import type { Properties } from 'csstype';
import { Card, getCardsByLocation } from '../Cards';
import { Icon } from './Icons';
import { useState, useEffect } from 'react';
//@ts-expect-error: JS Module
import { undo, strokes, sketchpad } from '../Canvas.js';

export function Toolbar({ G, playerID, moves, mode, setMode }: BoardProps<GameState> & { mode: string, setMode: Function }) {
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
      backgroundColor: '#eee',
      borderRadius: '1em',
    },
  };

  useEffect(() => {
    const create = (document.getElementById('create') as HTMLElement);
    if (mode === 'sketch' || mode === 'finalise') {
      create.style.display = 'flex'
    } else {
      create.style.display = 'none'
    }

    const finalise = (document.getElementById('finalise') as HTMLElement);
    if (mode === 'finalise') {
      finalise.style.display = 'flex'
    } else {
      finalise.style.display = 'none'
    }
  }, [mode])

  // Submit Card Wrapper
  const submitCard = async () => {
    if (playerID) {
      const title = (document.getElementById('titleInput') as HTMLInputElement);
      const description = (document.getElementById('descriptionInput') as HTMLInputElement);
      const author = (document.getElementById('authorInput') as HTMLInputElement);
      const image = strokes.length > 0 ? (document.getElementById("sketchpad") as HTMLCanvasElement).toDataURL("image/png") : undefined;

      if (title.value && description.value) {
          const createdCard: Card = {
            id: G.cards.length + 1,
            content: {
              title: title.value,
              description: description.value,
              author: author.value || 'anon',
              image: image,
              date: String(Number(new Date())),
            },
            location: 'hand',
            focused: [playerID],
            owner: playerID,
            timestamp: Number(new Date()),
          }

          // Update Gamestate
          moves.submitCard(createdCard);
          setMode('play');

          // Cleanup Creation Elements
          sketchpad.clear(); // Image
          strokes.length = 0; // Stroke History
          title.value = '';
          description.value = '';
          author.value = '';

          // Asynchronously Submit to Global Deck
          const submitEndpoint = import.meta.env.MODE === 'development' ? '/submit' : 'https://api.mcteamster.com/white/submit'
          await fetch(submitEndpoint, {
            method: "POST",
            body: JSON.stringify({
              title: createdCard.content.title,
              description: createdCard.content.description,
              author: createdCard.content.author,
              image,
            }),
            headers: {
              "Content-Type": "application/json",
            },
          })
      } else {
        if (title.value === '') {
          title.style.color = 'red';
          setTimeout(() => {
            title.style.color = 'black';
          }, 500)
        }
        if (description.value === '') {
          description.style.color = 'red';
          (document.getElementById('flavourbox') as HTMLElement).style.color = 'red';
          setTimeout(() => {
            description.style.color = 'black';
            (document.getElementById('flavourbox') as HTMLElement).style.color = 'black';
          }, 500)
        }
      }
    }

  }

  let toolset = <></>
  if (mode === 'play') {
    toolset = <>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('options') }} elevation={2}><Icon name='settings' />Options</wired-card>
      <wired-card style={{ ...styles.button }} onClick={() => { moves.pickupCard(true) }} elevation={2}>{deck.length > 0 ? <Icon name='play' /> : <Icon name='shuffle' />}{deck.length > 0 ? 'Pickup' : `Reshuffle (${pile.length + discard.length})`}</wired-card>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('sketch') }} elevation={2}><Icon name='create' />Create</wired-card>
    </>
  } else if (mode === 'sketch') {
    toolset = <>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('play') }} elevation={2}><Icon name='exit' />Close</wired-card>
      <wired-card style={{ ...styles.button }} onClick={() => { undo() }} elevation={2}><Icon name='undo' />Undo</wired-card>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('finalise') }} elevation={2}><Icon name='send' />Next</wired-card>
    </>
  } else if (mode === 'finalise') {
    toolset = <>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('sketch') }} elevation={2}><Icon name='back' />Back</wired-card>
      <wired-card style={{ ...styles.button }} onClick={() => { submitCard() }} elevation={2}><Icon name='done' />Submit</wired-card>
    </>
  } else if (mode === 'options') {
    toolset = <>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('play') }} elevation={2}><Icon name='exit' />Cancel</wired-card>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('play') }} elevation={2}><Icon name='done' />Confirm</wired-card>
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
      <Finalise />
      <Toolbar {...props} mode={mode} setMode={setMode} />
    </>
  )
}