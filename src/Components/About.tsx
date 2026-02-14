import type { Properties } from 'csstype';
import { Icon } from './Icons';
import { useNavigate } from 'react-router';
import { useContext, useEffect, useState } from 'react';
import { BoardProps } from 'boardgame.io/dist/types/packages/react';
import { GameState } from '../Game';
import { HotkeysContext } from '../lib/contexts';
import { externalLink } from '../lib/hooks';

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
      height: '3em',
      width: '3.5em',
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
      <div style={{ textDecoration: 'none' }} onClick={() => { externalLink("https://mcteamster.com") }}>
        a game by <u>mcteamster</u>
      </div>
      <div style={styles.paragraph} id='about'>
        <h2 style={styles.subheading}>About</h2>
        <p>This is <u onClick={() => { externalLink("https://en.wikipedia.org/wiki/1000_Blank_White_Cards") }}>1000 Blank White Cards</u> online.</p>
        <p>
          A social drawing party game where you make the rules. Best played with friends around a table or on video call -
          now available as a <u onClick={() => { externalLink("https://discord.com/discovery/applications/1389508624774201395") }}>Discord Activity!</u>
        </p>
        <p>
          Connect to the same Multiplayer Room to draw cards together using a common Deck.
          Play your cards on the Pile for everyone to see in real-time!
          Or maybe keep them hidden in your Hand, displayed on the Table, or Send them to someone else!
        </p>
        <p>
          Save and Load your Multiplayer Decks to keep your creations between games!
          (Decks from the previous version of this game are even backwards compatibile)
        </p>
        <p>
          Browse the Global Deck in Single Device mode, or use it for an instant pass-and-play experience.
          Create and submit cards here for the whole world to see!
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
          Please follow the guidelines for the best experience:
        </p>
        <p>
          - Stay safe and mindful, you are responsible for your own actions!<br />
          - Beware that anything you submit becomes public, even in Multiplayer rooms<br />
          - Be original, inclusive & avoid in-jokes
        </p>
        <p>
          Also feel free to share and use content from the game.
          If you do, give credit to the author and share a screenshot/permalink.
          Please get in <u onClick={() => { externalLink("https://www.buymeacoffee.com/mcteamster") }}>contact</u> if you have questions or wanna collab!
        </p>
      </div>
      <div style={styles.paragraph}>
        <h2 style={styles.subheading} id='terms'>Terms of Service</h2>
        <p>
          1. Privacy Policy<br />
          The only data that we collect is game information (e.g. card title, description, author, picture, date), and anonymous player usage tracking through Microsoft Clarity.
          Cards submitted to the global deck will remain in our database, where we reserve the right to handle this data in whatever way we deem appropriate.
          Cards in multiplayer rooms are automatically deleted from our database periodically.
          Note that multiplayer rooms are publicly accessible; we offer no warranty or security of the content within.
        </p>
        <p>
          2. Waiver of Liability<br />
          The user-generated content in this game does not express the views or opinions of the developers.
          Due to the unrestricted online nature of the game, players must be over the age of 18.
          We are not liable or accountable for any damage or injury that may result from playing this game.
        </p>
        <p>
          3. Creative Commons<br />
          Cards submitted to this website fall under the Creative Commons Attribution 4.0 International licence.
          This allows for cards to be shared, adapted, and used for commercial purposes by anyone provided
          that attribution is given. Attribution must be made to the listed author of a card.
          Please see <u onClick={() => { externalLink("https://creativecommons.org/licenses/by/4.0/") }}>this link</u> for more details.
        </p>
      </div>
      <div>
        <div style={styles.subheading} onClick={() => { externalLink('https://github.com/mcteamster/white') }}>
          <Icon name='github' />
          <p>v2.2.2</p>
        </div>
      </div>
      <wired-card style={{ ...styles.button, right: '1em' }} onClick={() => { navigate('/') }} elevation={2}><Icon name='copy' />Home</wired-card>
      {
        history.length > 1 &&
        <wired-card style={{ ...styles.button, left: '1em' }} onClick={() => { navigate(-1) }} elevation={2}><Icon name='back' />Back</wired-card>
      }
    </div>
  );
}

interface TutorialProps extends BoardProps<GameState> {
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
}

export function Tutorial({ isMultiplayer, playerID, mode, setMode }: TutorialProps) {
  const { hotkeys } = useContext(HotkeysContext);
  const [dismiss, setDismiss] = useState(localStorage.getItem('tutorial') == "false");

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
      flexDirection: 'row',
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
      padding: '0 1em',
      display: 'flex',
      flexDirection: 'column',
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
      fontSize: '2em',
      textAlign: 'center',
    },
    paragraph: {
      fontSize: '1.25em',
      overflowY: 'scroll',
      scrollbarWidth: 'none',
      boxShadow: '0px -10px 5px -5px lightgrey inset',
      padding: '0 0.5em',
      margin: '0 0 0.5em 0',
      textAlign: 'center',
      width: '25em',
      maxWidth: '80vw',
    }
  };

  const tutorialText = <>
    <div style={styles.paragraph}>
      <p>Blank White Cards is a drawing party game WITHOUT RULES. Create your own cards for a unique evolving gameplay experience.</p>
      <p>Warning: this game contains user generated content, please proceed at your own risk.</p>
      <p>There are some features to help with basic card game logistics:</p>
      <p><Icon name='copy' />Deck: Cards to be picked up</p>
      <p><Icon name='pile' />Pile: Played cards seen by all</p>
      <p><Icon name='discard' />Discard: Cards removed from play</p>
      <p><Icon name='hand' />Hand: Your held cards</p>
      {
        isMultiplayer ?
          <>
            <p><Icon name='display' />Table: Your shown cards</p>
            <p><Icon name='create' />Create your own cards</p>
            <p><Icon name='send' />Send them to other players</p>
            <p><Icon name='heart' />Save and Load decks for next time!</p>
            <h3>Gameplay Suggestions:</h3>
            <p>Multiplayer tends to work better with a "Gamemaster" - usually the host, as they have the ability to Load cards and Reset the game.</p>
            <p>Start with everyone creating some new cards - about 5 per player is good. Reset to shuffle all cards into the deck.</p>
            <p>Have everyone pick up a few cards to make a Hand, then take turns to play and pickup more.</p>
            <p>It's highly encouraged to keep creating cards between turns in response to what gets played.</p>
            <p>If playing for points, find somewhere to take notes. Points get complicated very fast!</p>
            <p>If playing with drinks, drink-responsibly :)</p>
            <p>Remember to Save the deck. You can filter it offline and reuse it again later.</p>
            <p>Alternatively, choose a Preset Deck for a super quick way to get started!</p>
            <p>Or why not just play Free-for-All? Let anyone do anything at any time and embrace the chaos!</p>
          </> :
          <>
            <p><Icon name='global' />Submit new cards to the Global Deck!</p>
            <h3>Gameplay Suggestions:</h3>
            <p><Icon name='shuffle' />Hotseat: Take turns to pick up, do the action (or not), and pass to the next player.</p>
            <p><Icon name='multi' />Try Multiplayer for more possibilities!</p>
          </>
      }
    </div>
  </>

  useEffect(() => {
    if (mode == 'play-tutorial' && (isMultiplayer || playerID == "0")) {
      if (hotkeys.space) {
        setDismiss(!dismiss);
        localStorage.setItem('tutorial', String(dismiss))
      } else if (hotkeys.enter) {
        setMode('play');
      }
    }
  }, [hotkeys, dismiss, isMultiplayer, playerID, mode, setMode])

  if (isMultiplayer || playerID == "0") {
    return (
      <wired-dialog open={mode == 'play-tutorial' || undefined}>
        <div style={styles.tutorial}>
          <div style={styles.heading}>How to Play?</div>
          {tutorialText}
          <div style={styles.buttonBox}>
            <div style={styles.dismissBox}>
              <wired-card style={styles.dismiss} onClick={() => { setDismiss(!dismiss); localStorage.setItem('tutorial', String(dismiss)) }}>
                {dismiss && <Icon name="exit" />}
              </wired-card>
              Don't Show Again
            </div>
            <wired-card style={styles.button} onClick={() => {
              setMode('play');
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