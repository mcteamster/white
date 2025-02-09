import type { Properties } from 'csstype';
import { Icon } from './Icons';
import { useNavigate } from 'react-router';

export function About() {
  const navigate = useNavigate();

  const styles: { [key: string]: Properties<string | number> } = {
    about: {
      width: '100%',
      minHeight: '100vh',
      zIndex: '10',
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
        <p>This is <a href="https://en.wikipedia.org/wiki/1000_Blank_White_Cards" target="_blank"><u>1000 Blank White Cards</u></a> for the internet.</p>
        <p>
          A social party game where you make the rules. Best played with friends around a table or on video call.
        </p>
        <p>
          Connect to the same Multiplayer Room to draw cards together using a common Deck*.
          Put your cards on the Pile for everyone to see in real-time!
          Or maybe keep them hidden in your Hand, or even displayed on the Table in front of you.
        </p>
        <p>
          Browse the Global Deck in Singleplayer mode for a local pass-and-play experience.
          Create a card here to submit your own masterpiece for the whole world to see!
        </p>
        <p>
          *Note: Multiplayer card Import/Export will be coming (back) soon.
        </p>
      </div>
      <div style={styles.paragraph}>
        <h2 style={styles.subheading} id='guidelines'>Guidelines</h2>
        <p>
          Blank White Cards has no rules...
        </p>
        <p>
          aside from any illegal or malicious content and actions being prohibited.
          This includes text, links, images, and anything else related to the game.
          We reserve the right to remove content at our discretion.
          Please follow the guidelines below for the best experience:
        </p>
        <p>
          - Be safe and mindful, you are responsible for your own actions!<br />
          - Beware that anything you submit becomes public, even in custom rooms<br />
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
        <a style={styles.subheading}href='https://github.com/mcteamster/white' target='_blank'>
          <Icon name='github' />
          <p>v2.0.0</p>
        </a>
      </div>
      <wired-card style={{ ...styles.button, width: '3.5em' }} onClick={() => { navigate('/') }} elevation={2}><Icon name='multi' />Lobby</wired-card>
    </div>
  );
}