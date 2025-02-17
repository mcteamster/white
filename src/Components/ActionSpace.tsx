import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import { Finalise } from './Finalise.tsx';
import { Focus } from './Focus.tsx';
import type { Properties } from 'csstype';
import { Card, getCardsByLocation } from '../Cards';
import { Icon } from './Icons';
import { useState, useEffect, useContext } from 'react';
//@ts-expect-error: JS Module
import { undo, strokes, sketchpad } from '../Canvas.js';
import { Link, useNavigate } from 'react-router';
import { AuthContext } from '../constants/contexts.ts';

interface ToolbarProps extends BoardProps<GameState> {
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
}

export function Toolbar({ G, playerID, moves, isMultiplayer, matchData, mode, setMode }: ToolbarProps) {
  const navigate = useNavigate();
  const { setAuth } = useContext(AuthContext);

  const deck = getCardsByLocation(G.cards, "deck");
  const pile = getCardsByLocation(G.cards, "pile");
  const discard = getCardsByLocation(G.cards, "discard");

  useEffect(() => {
    const create = (document.getElementById('create') as HTMLElement);
    if (mode === 'create-sketch' || mode === 'create-finalise') {
      create.style.display = 'flex'
    } else {
      create.style.display = 'none'
    }

    const finalise = (document.getElementById('finalise') as HTMLElement);
    if (mode === 'create-finalise') {
      finalise.style.display = 'flex'
      const author = (document.getElementById('authorInput') as HTMLInputElement);
      if (isMultiplayer && author.value == '') {
        author.value = matchData?.find((player) => player.id == Number(playerID))?.name?.toUpperCase() || ""
      }
    } else {
      finalise.style.display = 'none'
    }
  }, [mode, isMultiplayer, matchData, playerID])

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

        // Asynchronously Submit to Global Deck - Singleplayer Only
        if (!isMultiplayer) {
          const submitEndpoint = import.meta.env.MODE === 'development' ? '/submit' : `${import.meta.env.VITE_API_SERVER}/white/submit`
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
        }
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

  const leaveGame = () => {
    // Is there any point leaving gracefully via Lobby API?
    setAuth({});
    navigate('/');
  }

  const styles: { [key: string]: Properties<string | number> } = {
    toolbar: {
      width: '100%',
      height: '7em',
      position: 'fixed',
      bottom: '0',
      left: '0',
      zIndex: '8',
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

  let toolset = <></>
  if (mode === 'play') {
    toolset = <>
      <wired-card style={{ ...styles.button, width: '3.5em' }} onClick={() => { setMode('menu') }} elevation={2}><Icon name='menu' />Menu</wired-card>
      <wired-card style={{ ...styles.button, width: '9.75em', margin: '0' }} onClick={() => {
          if (G.cards.length > 0) {
            moves.pickupCard(true)
          } else {
            setMode('create-sketch') 
          }
        }} elevation={2}>
        {deck.length > 0 ? <Icon name='play' /> : G.cards.length == 0 ? <Icon name='create' /> : <Icon name='shuffle' />}
        {deck.length > 0 ? `Pickup [${deck.length}]` : G.cards.length == 0 ? "Add cards to start" : `Reshuffle [${pile.length + discard.length}]`}</wired-card>
      <wired-card style={{ ...styles.button, width: '3.5em' }} onClick={() => { setMode('create-sketch') }} elevation={2}><Icon name='create' />Create</wired-card>
    </>
  } else if (mode === 'create-sketch') {
    toolset = <>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('play') }} elevation={2}><Icon name='exit' />Close</wired-card>
      <wired-card style={{ ...styles.button }} onClick={() => { undo() }} elevation={2}><Icon name='undo' />Undo</wired-card>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('create-finalise') }} elevation={2}><Icon name='send' />Next</wired-card>
    </>
  } else if (mode === 'create-finalise') {
    toolset = <>
      <wired-card style={{ ...styles.button }} onClick={() => { setMode('create-sketch') }} elevation={2}><Icon name='back' />Back</wired-card>
      <wired-card style={{ ...styles.button }} onClick={() => { submitCard() }} elevation={2}><Icon name='done' />Submit</wired-card>
    </>
  } else if (mode === 'menu') {
    toolset = <>
      <wired-card style={{ ...styles.button, width: '3.5em' }} onClick={() => { setMode('play') }} elevation={2}><Icon name='exit' />Close</wired-card>
      <wired-card style={{ ...styles.button, width: '3.5em' }} onClick={() => { setMode('menu-settings') }} elevation={2}><Icon name='settings' />Options</wired-card>
      <wired-card style={{ ...styles.button, width: '3.5em' }} onClick={() => { setMode('menu-info') }} elevation={2}><Icon name='info' />Info</wired-card>
      <wired-card style={{ ...styles.button, width: '3.5em', color: 'red' }} onClick={() => { leaveGame() }} elevation={2}><Icon name='logout' />{isMultiplayer ? 'Leave' : 'Lobby'}</wired-card>
    </>
  } else if (mode === 'menu-info') {
    toolset = <>
      <wired-card style={{ ...styles.button, width: '3.5em' }} onClick={() => { setMode('menu') }} elevation={2}><Icon name='back' />Back</wired-card>
      <Link to="/about" target='_blank' rel="noreferrer" style={{ textDecoration: 'none' }}><wired-card style={{ ...styles.button, width: '3.5em' }} elevation={2}><Icon name='about' />About</wired-card></Link>
      <Link to="/card" target='_blank' rel="noreferrer" style={{ textDecoration: 'none' }}><wired-card style={{ ...styles.button, width: '3.5em' }} elevation={2}><Icon name='pile' />Gallery</wired-card></Link>
      <Link to="https://mcteamster.com" target='_blank' rel="noreferrer" style={{ textDecoration: 'none' }}><wired-card style={{ ...styles.button, width: '3.5em' }} elevation={2}><Icon name='single' />Contact</wired-card></Link>
    </>
  } else if (mode === 'menu-settings') {
    toolset = <>
      <wired-card style={{ ...styles.button, width: '3.5em' }} onClick={() => { setMode('menu') }} elevation={2}><Icon name='back' />Back</wired-card>
      <wired-card style={{
        ...styles.button,
        width: '3.5em',
        color: 'grey',
        // color: (isMultiplayer ? undefined : 'grey'),
      }} onClick={() => { }} elevation={2}><Icon name='display' />Import</wired-card>
      <wired-card style={{
        ...styles.button,
        width: '3.5em',
        color: 'grey',
        // color: (isMultiplayer ? undefined : 'grey'),
      }} onClick={() => { }} elevation={2}><Icon name='take' />Export</wired-card>
      <wired-card style={{ ...styles.button, width: '3.5em', color: 'red' }} onClick={() => { moves.shuffleCards(); setMode('play') }} elevation={2}><Icon name='shuffle' />Reset</wired-card>
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
      <Finalise multiplayer={props.isMultiplayer} />
      <Toolbar {...props} mode={mode} setMode={setMode} />
    </>
  )
}