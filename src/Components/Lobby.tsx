import { useNavigate } from "react-router";
import { Properties } from 'csstype';
import { Icon } from './Icons';
import { useContext } from "react";
import { AuthContext } from "../constants/contexts";
import { lobbyClient } from "../constants/clients";

export function Lobby(props: { globalSize: number }) {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext)

  const enterSinglePlayer = () => {
    setAuth({});
    navigate('/app');
  }

  const createGame = async () => {
    const playerName = checkForPlayerName();
    if (playerName) {
      // TODO: Custom Deck Uploads
      let startingDeck;

      // Create Match on Server
      const { matchID } = await lobbyClient.createMatch('blank-white-cards', {
        unlisted: true,
        numPlayers: 1000,
        setupData: startingDeck,
      });

      if (matchID.match(/^[BCDFGHJKLMNPQRSTVWXYZ]{4}$/)) {
        // Join Match as playerID 0
        const { playerCredentials } = await lobbyClient.joinMatch(
          'blank-white-cards',
          matchID,
          {
            playerID: "0",
            playerName,
          }
        );
        setAuth({
          matchID: matchID,
          playerID: "0",
          credentials: playerCredentials,
          playerName: playerName,
        });
        navigate(`/${matchID}`);
      }
    }
  }

  const joinGame = async () => {
    const playerName = checkForPlayerName();
    if (playerName) {
      const roomCode = (document.getElementById("roomInput") as HTMLInputElement);
      if (roomCode.value.toUpperCase().match(/^[BCDFGHJKLMNPQRSTVWXYZ]{4}$/)) {
        try {
          const { playerID, playerCredentials } = await lobbyClient.joinMatch(
            'blank-white-cards',
            roomCode.value.toUpperCase(),
            {
              playerName,
            }
          );
          setAuth({
            matchID: roomCode.value.toUpperCase(),
            playerID: playerID,
            credentials: playerCredentials,
            playerName: playerName,
          })
          navigate(`/${roomCode.value.toUpperCase()}`);
        } catch (e) {
          console.error(e);
          roomCodeError();
        }
      } else {
        roomCodeError();
      }
    }
  }

  const checkForPlayerName = () => {
    const playerName = (document.getElementById("nameInput") as HTMLInputElement);
    if (!playerName.value) {
      playerName.style.color = 'red';
      (document.getElementById('flavourbox') as HTMLElement).style.color = 'red';
      setTimeout(() => {
        playerName.style.color = 'black';
        (document.getElementById('flavourbox') as HTMLElement).style.color = 'black';
      }, 500)
      return false
    } else {
      return playerName.value
    }
  }

  const roomCodeError = () => {
    setAuth({});
    const roomCode = (document.getElementById("roomInput") as HTMLInputElement);
    roomCode.value = "";
    roomCode.style.color = 'red';
    (document.getElementById('flavourbox') as HTMLElement).style.color = 'red';
    setTimeout(() => {
      roomCode.style.color = 'black';
      (document.getElementById('flavourbox') as HTMLElement).style.color = 'black';
    }, 500)
  }

  const styles: { [key: string]: Properties<string | number> } = {
    dialog: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    mode: {
      width: 'min(35vh, 90vw)',
      height: 'min(35vh, 90vw)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
    },
    heading: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      fontSize: "2em",
    },
    subheading: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      fontSize: "1.25em",
    },
    name: {
      width: '90%',
    },
    rooms: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
    },
    code: {
      width: '4.75em',
    },
    enter: {
      width: "1.5em",
      height: '1.5em',
      margin: '0.25em',
      backgroundColor: '#eee',
      borderRadius: '0.5em',
    },
    create: {
      backgroundColor: '#eee',
      borderRadius: '0.5em',
      fontSize: '1.25em',
    },
    terms: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      fontSize: '0.75em',
    }
  }

  return (
    <wired-dialog open>
      <div style={styles.dialog}>
        <wired-card style={styles.mode}>
          <div style={styles.heading}><Icon name="multi" />&nbsp;Multiplayer</div>
          <wired-input style={styles.name} id="nameInput" placeholder="Player Name" maxlength={25} value={auth?.playerName}></wired-input>
          <div>and</div>
          <div style={styles.rooms}>
            <wired-input style={styles.code} id="roomInput" placeholder="Room Code" maxlength={4} value={auth?.matchID}></wired-input>
            <wired-card style={styles.enter} onClick={joinGame}><Icon name="send" /></wired-card>
          </div>
          <div>or</div>
          <wired-card style={styles.create} onClick={createGame}>Create Game</wired-card>
        </wired-card>
        <wired-card style={styles.mode} onClick={enterSinglePlayer}>
          <div style={styles.heading}><Icon name="single" />&nbsp;Singleplayer</div>
          <div style={styles.heading}>[&nbsp;{props.globalSize}&nbsp;]</div>
          <div style={styles.subheading}>Cards in the Global Deck</div>
          <div style={styles.subheading}>Draw and add your own!</div>
        </wired-card>
      </div>
      <div style={styles.terms}>
        <div>by continuing you confirm you are over 18</div>
        <div>and accept our <a href='/about' target="_blank"><u>Terms of Service</u></a></div>
      </div>
    </wired-dialog>
  );
}