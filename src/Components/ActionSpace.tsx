import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import { Finalise } from './Finalise.tsx';
import { Focus } from './Focus.tsx';
import type { Properties } from 'csstype';
import { Card, getCardsByLocation, getCardsByOwner } from '../Cards';
import { Icon } from './Icons';
import { useState, useEffect, useContext, useRef, useCallback } from 'react';
//@ts-expect-error: JS Module
import { undo, strokes, sketchpad } from '../Canvas.js';
import { Link, useNavigate } from 'react-router';
import { AuthContext, FocusContext } from '../lib/contexts.ts';
import { downloadDeck, resizeImage } from '../lib/data.ts';
import { Loader } from './Loader.tsx';
import { submitGlobalCard } from '../lib/clients.ts';

interface ToolbarProps extends BoardProps<GameState> {
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
}

export function Toolbar({ G, playerID, moves, isMultiplayer, matchData, mode, setMode, ctx }: ToolbarProps) {
  const navigate = useNavigate();
  const { setAuth } = useContext(AuthContext);
  const [debounced, setDebounced] = useState(false);
  const { focus, setFocus } = useContext(FocusContext);
  const focusCard = useCallback(((id: number, focusState: boolean) => {
    if (focus?.id != id && focusState == true) {
      setFocus({ id });
    } else {
      setFocus({});
    }
  }), [focus, setFocus]);

  const deck = getCardsByLocation(G.cards, "deck");
  const pile = getCardsByLocation(G.cards, "pile");
  const discard = getCardsByLocation(G.cards, "discard");
  const hand = getCardsByLocation(getCardsByOwner(G.cards, playerID || "0"), "hand");

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
            image: image ? await resizeImage(image) : undefined,
            date: String(Number(new Date())),
          },
          location: 'hand',
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
          submitGlobalCard(createdCard);
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

  // Track number of moves made by the player to debounce button
  const prevNumMoves = useRef({ numMoves: 0, timestamp: new Date() });
  useEffect(() => {
    const activePlayersNumMoves = ctx._activePlayersNumMoves
    if (playerID && activePlayersNumMoves) {
      if (activePlayersNumMoves[playerID] > prevNumMoves.current.numMoves) {
        prevNumMoves.current = {
          numMoves: activePlayersNumMoves[playerID],
          timestamp: new Date(),
        };

        if (debounced) {
          // Focus the top-decked card and debounce
          if (hand.length > 0) {
            const justPickedUpCard = hand.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0]; // Newest to Oldest
            focusCard(justPickedUpCard.id, true)
            setTimeout(() => {
              setDebounced(false);
            }, 500);
          }
        }
      }
    }
  }, [ctx, playerID, debounced, focusCard, hand])

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

  // Initialise Buttons
  let toolset = <></>
  if (mode === 'play') {
    let mainButtonIcon = <></>
    let mainButtonText = ''
    if (deck.length > 0) {
      if (debounced) {
        mainButtonIcon = <div className='spin'>
          <Icon name='loading' />
        </div>
        mainButtonText = `Pickup [${deck.length}]`
      } else {
        mainButtonIcon = <Icon name='play' />
        mainButtonText = `Pickup [${deck.length}]`
      }
    } else if (G.cards.length == 0) {
      if (playerID == '0') {
        mainButtonIcon = <Icon name='display' />
        mainButtonText = 'Load Saved Deck?'
      } else {
        mainButtonIcon = <Icon name='create' />
        mainButtonText = 'Create Cards to Begin'
      }
    } else {
      mainButtonIcon = <Icon name='shuffle' />
      mainButtonText = `Reshuffle [${pile.length + discard.length}]`
    }

    toolset = <>
      <wired-card style={{ ...styles.button, width: '3em' }} onClick={() => { setMode('menu') }} elevation={2}><Icon name='menu' />Menu</wired-card>
      <wired-card style={{ ...styles.button, width: '9.75em', margin: '0' }} onClick={() => {
          if (G.cards.length > 0) {
            if (!debounced) { 
              setDebounced(true);
              moves.pickupCard(true);
            }
          } else if (playerID == '0') {
            setMode('menu-tools-loader')
          } else {
            setMode('create-sketch') 
          }
        }} elevation={2}>
        {mainButtonIcon}
        {mainButtonText}
      </wired-card>
      <wired-card style={{ ...styles.button, width: '3em' }} onClick={() => { setMode('create-sketch') }} elevation={2}><Icon name='create' />Create</wired-card>
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
      <wired-card style={{ ...styles.button, width: '3em' }} onClick={() => { setMode('play') }} elevation={2}><Icon name='exit' />Close</wired-card>
      <wired-card style={{ ...styles.button, width: '3em' }} onClick={() => { setMode('menu-tools') }} elevation={2}><Icon name='settings' />Tools</wired-card>
      <wired-card style={{ ...styles.button, width: '3em' }} onClick={() => { setMode('menu-info') }} elevation={2}><Icon name='info' />Info</wired-card>
      <wired-card style={{ ...styles.button, width: '3em', color: 'red' }} onClick={() => { setMode('menu-leave') }} elevation={2}><Icon name='logout' />{isMultiplayer ? 'Leave' : 'Lobby'}</wired-card>
    </>
  } else if (mode === 'menu-info') {
    toolset = <>
      <wired-card style={{ ...styles.button, width: '3em' }} onClick={() => { setMode('menu') }} elevation={2}><Icon name='back' />Back</wired-card>
      <Link to="/about" target='_blank' rel="noreferrer" style={{ textDecoration: 'none' }}><wired-card style={{ ...styles.button, width: '3em' }} elevation={2}><Icon name='about' />About</wired-card></Link>
      <Link to="https://mcteamster.com" target='_blank' rel="noreferrer" style={{ textDecoration: 'none' }}><wired-card style={{ ...styles.button, width: '3em' }} elevation={2}><Icon name='game' />Games</wired-card></Link>
      <Link to="https://www.buymeacoffee.com/mcteamster" target='_blank' rel="noreferrer" style={{ textDecoration: 'none' }}><wired-card style={{ ...styles.button, width: '3em' }} elevation={2}><Icon name='coffee' />Support</wired-card></Link>
    </>
  } else if (mode === 'menu-tools') {
    toolset = <>
      <wired-card style={{ ...styles.button, width: '3em' }} onClick={() => { setMode('menu') }} elevation={2}><Icon name='back' />Back</wired-card>
      {
        // Show Save Button if Multiplayer, else Gallery Button
        isMultiplayer ?
        <wired-card style={{
            ...styles.button,
            width: '3em',
            color: ((G.cards.length > 0) ? undefined : 'grey'),
          }} 
          onClick={() => { 
            if (G.cards.length > 0) {
              downloadDeck(G)
            }
          }} elevation={2}>
          <Icon name='take' />Save
        </wired-card> :
        <Link to="/card" target='_blank' rel="noreferrer" style={{ textDecoration: 'none' }}><wired-card style={{ ...styles.button, width: '3em' }} elevation={2}><Icon name='pile' />Gallery</wired-card></Link>
      }
      <wired-card style={{
          ...styles.button,
          width: '3em',
          color: ((playerID == '0') ? undefined : 'grey'), // Only the host can load cards
        }} onClick={() => { if (playerID == '0') { setMode('menu-tools-loader') }}} elevation={2}>
        <Icon name='display' />Load
      </wired-card>
      <wired-card style={{ 
        ...styles.button, 
        width: '3em', 
        color: ((playerID == '0' && G.cards.length > 0) ? undefined : 'grey') // Only the host can reset the game
      }} onClick={() => { if (playerID == '0' && G.cards.length > 0) { setMode('menu-tools-reset') }}} elevation={2}><Icon name='shuffle' />Reset</wired-card>
    </>
  } else if (mode === 'menu-tools-reset') {
    toolset = <>
      <wired-card style={{ ...styles.button, width: '14em', color: 'red' }} onClick={() => { moves.shuffleCards(); setMode('play') }} elevation={2}><Icon name='shuffle' />Reshuffle all cards{isMultiplayer && " for ALL PLAYERS"}</wired-card>
      <wired-card style={{ ...styles.button, width: '3em' }} onClick={() => { setMode('play') }} elevation={2}><Icon name='exit' />Cancel</wired-card>
    </>
  } else if (mode === 'menu-leave') {
    toolset = <>
      <wired-card style={{ ...styles.button, width: '14em', color: 'red' }} onClick={() => { leaveGame() }} elevation={2}><Icon name='logout' />Exit to Lobby - Are you sure? </wired-card>
      <wired-card style={{ ...styles.button, width: '3em' }} onClick={() => { setMode('menu') }} elevation={2}><Icon name='back' />Back</wired-card>
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
      <Loader {...props} mode={mode} setMode={setMode}></Loader>
    </>
  )
}