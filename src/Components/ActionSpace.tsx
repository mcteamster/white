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
import { AuthContext, FocusContext, LoadingContext } from '../lib/contexts.ts';
import { downloadDeck } from '../lib/data.ts';
import { Loader } from './Loader.tsx';
import { submitGlobalCard } from '../lib/clients.ts';
import { Tutorial } from './About.tsx';
import { compressImage, resizeImage } from '../lib/images.ts';
import { externalLink } from '../lib/hooks.ts';

interface ToolbarProps extends BoardProps<GameState> {
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
}

export function Toolbar({ G, playerID, moves, isMultiplayer, matchData, mode, setMode, ctx }: ToolbarProps) {
  const navigate = useNavigate();
  const { setAuth } = useContext(AuthContext);
  const { loading, setLoading } = useContext(LoadingContext);
  const [submitStatus, setSubmitStatus] = useState('Submit');
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
      const image = strokes.length > 0 ? (await resizeImage((document.getElementById("sketchpad") as HTMLCanvasElement).toDataURL("image/png"))) : undefined;
      let imageData;
      if (import.meta.env.VITE_COMPRESS_IMAGES === 'true' && image) {
        // Image Compression to minimise gamestate size for network optimisation
        imageData = (await compressImage(image))
      } else {
        imageData = image
      }

      if (title.value && description.value) {
        const createdCard: Card = {
          id: G.cards.length + 1,
          content: {
            title: title.value,
            description: description.value,
            author: author.value || 'anon',
            image: imageData,
            date: String(Number(new Date())),
          },
          location: 'hand',
          owner: playerID,
          timestamp: Number(new Date()),
        }

        // Submit to Global Deck - Singleplayer Only
        const submitCardButton = document.getElementById('submitCardButton');

        const submitError = () => {
          if (submitCardButton) {
            submitCardButton.style.color = 'red';
            setTimeout(() => {
              setSubmitStatus('Retry?');
            }, 1000)
          }
        }

        if (!isMultiplayer && submitCardButton) {
          submitCardButton.style.color = 'black';
          setSubmitStatus('Submitting');
          try {
            const request = await submitGlobalCard(createdCard);
            if (request.status == 200) {
              setSubmitStatus('Submit');
            } else {
              submitError();
              return
            }
          } catch (err) {
            console.warn(err);
            submitError();
            return
          }
        }

        // Update Gamestate
        moves.submitCard(createdCard);
        setMode('play');

        // Cleanup creation elements in background
        sketchpad.clear(); // Image
        strokes.length = 0; // Stroke History
        title.value = '';
        description.value = '';
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

  const leaveGame = useCallback(() => {
    // Is there any point leaving gracefully via Lobby API?
    setAuth({});
    navigate('/');
  }, [setAuth, navigate])

  // Track number of moves made by the player to debounce button
  const moveTracker = useRef({ numMoves: 0, timestamp: (new Date()).getTime() });
  useEffect(() => {
    const activePlayersNumMoves = ctx._activePlayersNumMoves
    if (playerID && activePlayersNumMoves) {
      if (activePlayersNumMoves[playerID] > moveTracker.current.numMoves) {
        // Update Reference
        moveTracker.current = {
          numMoves: activePlayersNumMoves[playerID],
          timestamp: (new Date()).getTime(),
        };

        // Handle Pickup Debounce
        if (loading) {
          if (hand.length > 0) {
            // Auto-play to pile immediately in single player mode
            if (!isMultiplayer) {
              const justPickedUpCard = hand.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0]; // Newest to Oldest
              // If it came from the Pile, no need to auto-play
              if (!justPickedUpCard.previousOwner) {
                moves.moveCard(justPickedUpCard.id, 'pile');
              }
            }
            setTimeout(() => {
              // Scroll to latest card only in multiplayer
              if (isMultiplayer) {
                window.scrollTo(0, document.body.scrollHeight);
              }
              setLoading(false);
            }, 250);
          }
        }
      } else {
        if (loading) {
          const checkTimeout = () => {
            // Check if it's been longer than 6 seconds
            const now = (new Date()).getTime();
            if ((now - moveTracker.current.timestamp) > 6000) {
              setTimeout(() => {
                setLoading(false);
              }, 0);
            } else {
              setTimeout(checkTimeout, 1000)
            }
          }
          checkTimeout();
        } else {
          // Update Reference
          moveTracker.current = {
            numMoves: activePlayersNumMoves[playerID],
            timestamp: (new Date()).getTime(),
          };
        }
      }
    }
  }, [ctx, playerID, loading, setLoading, focusCard, hand, isMultiplayer])

  const styles: { [key: string]: Properties<string | number> } = {
    toolbar: {
      width: '100%',
      maxWidth: '40em',
      height: '7em',
      position: 'fixed',
      bottom: '0',
      left: '50%',
      transform: 'translate(-50%, 0%)',
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
    mainButtonContent: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '0.25em',
      fontSize: '1.25em',
    },
  };

  // Initialise Buttons
  let toolset = <></>
  if (mode === 'play') {
    let mainButtonContent = <></>
    if (deck.length > 0) {
      if (loading) {
        mainButtonContent = <div className='spin'>
          <Icon name='loading' />
        </div>
      } else {
        mainButtonContent = <>
          <Icon name='play'></Icon>
          PICK UP CARD
        </>
      }
    } else if (G.cards.length == 0) {
      if (playerID == '0') {
        mainButtonContent = <>
          <Icon name='display' />
          Load Deck?
        </>
      } else {
        mainButtonContent = <>
          <Icon name='create' />
          Create Cards
        </>
      }
    } else if (pile.length + discard.length > 0) {
      mainButtonContent = <>
        <Icon name='discard' />
        Reset Pile ({pile.length + discard.length})
      </>
    } else {
      if (playerID == '0') {
        mainButtonContent = <>
          <Icon name='shuffle' />
          Shuffle ALL ({G.cards.length})
        </>
      } else {
        mainButtonContent = <>
          <Icon name='create' />
          Create Cards
        </>
      }
    }

    toolset = <>
      <wired-card style={{ ...styles.button, width: '3em' }} onClick={() => { setMode('menu') }} elevation={2}><Icon name='menu' />Menu</wired-card>
      <wired-card style={{ ...styles.button, width: '9.75em', margin: '0' }} onClick={() => {
        if (deck.length > 0) {
          if (!loading) {
            setLoading(true);
            moves.pickupCard(true);
          }
        } else if (G.cards.length == 0) {
          if (playerID == '0') {
            setMode('menu-tools-loader')
          } else {
            setMode('create-sketch')
          }
        } else if (pile.length + discard.length > 0) {
          if (!loading) {
            setLoading(true);
            moves.pickupCard(true);
          }
        } else {
          if (playerID == '0') {
            setMode('menu-tools-reset')
          } else {
            setMode('create-sketch')
          }   
        }
      }} elevation={2}>
        <div style={{ ...styles.mainButtonContent }}>
          {mainButtonContent}
        </div>
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
      <wired-card style={{ ...styles.button }} onClick={() => { if (submitStatus != 'Submitting') { submitCard() } }} elevation={2} id='submitCardButton' key='submitCardButton'>
        {
          submitStatus == 'Submitting' ? <div className='spin'><Icon name='loading' /></div> : submitStatus == 'Retry?' ? <Icon name='shuffle' /> : <Icon name='done' />
        }
        {submitStatus}
      </wired-card>
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
      <wired-card style={{ ...styles.button, width: '3em' }} onClick={() => { setMode('play-tutorial') }} elevation={2}><Icon name='book' />Tutorial</wired-card>
      <Link to="/about" rel="noreferrer" style={{ textDecoration: 'none' }}><wired-card style={{ ...styles.button, width: '3em' }} elevation={2}><Icon name='about' />About</wired-card></Link>
      <div onClick={() => { externalLink("https://www.buymeacoffee.com/mcteamster") }} style={{ textDecoration: 'none' }}><wired-card style={{ ...styles.button, width: '3em' }} elevation={2}><Icon name='coffee' />Support</wired-card></div>
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
          <Link to="/card" rel="noreferrer" style={{ textDecoration: 'none' }}><wired-card style={{ ...styles.button, width: '3em' }} elevation={2}><Icon name='search' />Gallery</wired-card></Link>
      }
      <wired-card style={{
        ...styles.button,
        width: '3em',
        color: ((playerID == '0') ? undefined : 'grey'), // Only the host can load cards
      }} onClick={() => { if (playerID == '0') { setMode('menu-tools-loader') } }} elevation={2}>
        {
          isMultiplayer ?
          <>
            <Icon name='display' />Load
          </> :
          <>
            <Icon name='global' />Submit
          </>
        }
      </wired-card>
      <wired-card style={{
        ...styles.button,
        width: '3em',
        color: ((playerID == '0' && G.cards.length > 0) ? undefined : 'grey') // Only the host can reset the game
      }} onClick={() => { if (playerID == '0' && G.cards.length > 0) { setMode('menu-tools-reset') } }} elevation={2}><Icon name='shuffle' />Reset</wired-card>
    </>
  } else if (mode === 'menu-tools-reset') {
    toolset = <>
      <wired-card style={{ ...styles.button, width: '14em', color: 'red' }} onClick={() => { moves.shuffleCards(); setMode('play') }} elevation={2}><Icon name='shuffle' />Shuffle ALL CARDS into the deck</wired-card>
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
  const [mode, setMode] = useState(localStorage.getItem('tutorial') != "false" ? 'play-tutorial' : 'play');
  return (
    <>
      <Focus {...props} />
      <Finalise multiplayer={props.isMultiplayer} />
      <Toolbar {...props} mode={mode} setMode={setMode} />
      <Loader {...props} mode={mode} setMode={setMode}></Loader>
      <Tutorial {...props} mode={mode} setMode={setMode} />
    </>
  )
}