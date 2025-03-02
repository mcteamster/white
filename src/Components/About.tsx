import type { Properties } from 'csstype';
import { Icon } from './Icons';
import { useNavigate } from 'react-router';
import { useState } from 'react';
import { BoardProps } from 'boardgame.io/dist/types/packages/react';
import { GameState } from '../Game';

export function About() {
  const navigate = useNavigate();

  const styles: { [key: string]: Properties<string | number> } = {
    about: {
      width: '100%',
      minHeight: '100vh',
      padding: '1em 0',
      position: 'absolute',
      top: '0',
      left: '0',
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      position: 'fixed',
      bottom: '1em',
      left: '1em',
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
    subheading: {
      textAlign: 'center',
    },
    paragraph: {
      fontSize: '1.25em',
      textAlign: 'justify',
      width: '40em',
      maxWidth: '85vw',
    }
  };

  return (
    <div style={styles.about}>
      <h1>Blank White Cards</h1>
      <div>a game by mcteamster</div>
      <div style={styles.paragraph} id='about'>
        <h2 style={styles.subheading}>About</h2>
        <p>This is <a href="https://en.wikipedia.org/wiki/1000_Blank_White_Cards" target="_blank"><u>1000 Blank White Cards</u></a> online.</p>
        <p>
          A social party game sandbox where you make the rules. Best played with friends around a table or on video call.
        </p>
        <p>
          Connect to the same Multiplayer Room to draw cards together using a common DECK.*
          Put your cards on the PILE for everyone to see in real-time!
          Or maybe keep them hidden in your HAND, displayed on the TABLE in front of you, or even SEND them to someone else!
        </p>
        <p>
          Browse the Global Deck in Single Device mode for a local pass-and-play experience.
          Create and submit cards here for the whole world to see!
        </p>
        <p>
          *The Save / Load tools for Multiplayer Decks are now availble (with backwards compatibility)!
        </p>
      </div>
      <div style={styles.paragraph}>
        <h2 style={styles.subheading} id='guidelines'>Guidelines</h2>
        <p>
          Blank White Cards has no rules...
        </p>
        <p>
          aside from  illegal or malicious content and actions being prohibited.
          This includes text, links, images, and anything else related to the game.
          We reserve the right to remove content at our discretion.
          Please follow the guidelines below for the best experience:
        </p>
        <p>
          - Be safe and mindful, you are responsible for your own actions!<br />
          - Beware that anything you submit becomes public, even in Multiplayer rooms<br />
          - Be original, inclusive & avoid in-jokes
        </p>
        <p>
          Also feel welcome to share and use content from the game.
          If you do, give credit to the author and share a screenshot/permalink.
          Please get in <a href="https://instagram.com/blankwhitecards" target='_blank'><u>contact</u></a> if you have any questions or wanna collab!
        </p>
      </div>
      <div style={styles.paragraph}>
        <h2 style={styles.subheading} id='terms'>Terms of Service</h2>
        <p>
          1. Privacy Policy<br />
          The only data that we collect is game card information (e.g. title, description, author, picture, date), and aggregated player usage stats.
          Cards submitted to the global deck will remain in our database, where we reserve the right to handle this data in whatever way we deem appropriate.
          Cards in multiplayer rooms are automatically deleted from our database periodically.
          Note that multiplayer rooms are publicly accessible; we offer no warranty or security of the content within.
        </p>
        <p>
          2. Waiver of Liability<br />
          The user-generated content in this game does not express the views or opinions
          of the developers. Due to the unrestricted online nature of the game, players must be over the age of 18.
          We are not liable or accountable for any damage or injury that may result from playing this game.
        </p>
        <p>
          3. Creative Commons<br />
          Cards submitted to this website fall under the Creative Commons Attribution 4.0 International licence.
          This allows for cards to be shared, adapted, and used for commercial purposes by anyone provided
          that attribution is given. Attribution must be made to the listed author of a card.
          Please see <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank"><u>this link</u></a> for more details.
        </p>
      </div>
      <div>
        <a style={styles.subheading} href='https://github.com/mcteamster/white' target='_blank'>
          <Icon name='github' />
          <p>v2.0.0</p>
        </a>
      </div>
      <wired-card style={{ ...styles.button, width: '3.5em' }} onClick={() => { navigate('/') }} elevation={2}><Icon name='logout' />Lobby</wired-card>
    </div>
  );
}

export function Tutorial(props: BoardProps<GameState>) {
  const [showTutorial, setShowTutorial] = useState(!sessionStorage.getItem("hideTutorial"));
  const [dismiss, setDismiss] = useState(false);

  const styles: { [key: string]: Properties<string | number> } = {
    tutorial: {
      maxHeight: '75vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonBox: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      height: '3em',
      width: '6em',
      margin: '0.25em',
      fontWeight: 'bold',
      textAlign: 'center',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#eee',
      borderRadius: '1em',
    },
    dismissBox: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dismiss: {
      height: '1em',
      width: '1em',
      margin: '0.25em',
      fontWeight: 'bold',
      textAlign: 'center',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#eee',
      borderRadius: '1em',
    },
    heading: {
      fontSize: '1.5em',
      textAlign: 'center',
    },
    subheading: {
      textAlign: 'center',
    },
    paragraph: {
      overflowY: 'scroll',
      scrollbarWidth: 'none',
      padding: '0.5em',
      textAlign: 'justify',
      width: '25em',
      maxWidth: '80vw',
    }
  };

  const tutorialText = <>
    <div style={styles.paragraph}>
      <p>This is a sandbox game that has no exact rules. However, there are some conventional card game concepts:</p>
      <p>The <u>Deck</u>: All the cards that can be <u>Picked Up</u></p>
      <p>The <u>Pile</u>: A central area where cards can be <u>Played</u></p>
      <p>Your <u>Hand</u>: Your hidden collection of cards</p>
      <p>The <u>Table</u>: Your displayed collection of cards</p>
      <p>The <u>Discard</u>: Cards removed and hidden from play</p>
      {
        props.isMultiplayer ?
        <>
          <p>You can <u>Move</u> your cards between these locations and even <u>Send</u> them to other players</p>
          <p><u>Create</u> new cards and <u>Save</u> them for next time!</p>
          <h3 style={styles.subheading}>Game Suggestions:</h3>
          <p>Multiplayer tends to work better with a "Gamemaster" - usually the host, as they have the ability to <u>Load</u> cards and <u>Reset</u> the game.</p>
          <p>Spend some time creating new cards at the start of the game - about 2 or 3 per player. <u>Reset</u> to shuffle all cards into the deck.</p>
          <p>If playing for points, find somewhere to take notes. Points get complicated very fast!</p>
          <p>If playing with drinks, drink-responsibly :)</p>
          <p>Remember to <u>Save</u> the deck. You can edit it offline and reuse it later.</p>
          <p>Or just play Free-for-All. Anyone can do anything at any time. Embrace the chaos!</p>
        </> :
        <>
          <p>You can <u>Move</u> your cards between these locations</p>
          <p><u>Create</u> and <u>Submit</u> new cards to the Global Deck!</p>
          <h3 style={styles.subheading}>Game Suggestions:</h3>
          <p>Hotseat Mode. Take turns to pick up a card, do the action (or not), and pass to the next player</p>
          <p style={styles.subheading}>(Try Multiplayer for more possibilities!)</p>
        </>
      }
    </div>
  </>

  if (props.isMultiplayer || props.playerID == "0") {
    return (
      <wired-dialog open={showTutorial || undefined}>
        <div style={styles.tutorial}>
          <div style={styles.heading}>How to Play</div>
          {tutorialText}
          <div style={styles.buttonBox}>
            <div style={styles.dismissBox}>
              Don't Show Again
              <wired-card style={styles.dismiss} onClick={() => { setDismiss(!dismiss) }}>
                {dismiss && <Icon name="exit" />}
              </wired-card>
            </div>
            <wired-card style={styles.button} onClick={() => {
              if (dismiss) {
                sessionStorage.setItem('hideTutorial', "1")
              }
              setShowTutorial(false);
            }}>
              <Icon name="done" />
              Let's Play!
            </wired-card>
          </div>
        </div>
      </wired-dialog>
    )
  }
}