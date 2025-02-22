import { useNavigate } from "react-router";
import { Properties } from 'csstype';
import { Icon } from './Icons';
import { useContext } from "react";
import { AuthContext, AuthType } from "../lib/contexts";
import { lobbyClient } from "../lib/clients";

const styles: { [key: string]: Properties<string | number> } = {
  dialog: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiplayer: {
    width: 'min(35vh, 85vw)',
    height: 'min(45vh, 85vw)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  singleplayer: {
    width: 'min(35vh, 85vw)',
    height: 'min(25vh, 85vw)',
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
    width: "3.5em",
    height: '1.5em',
    margin: '0.25em',
    backgroundColor: '#eee',
    borderRadius: '0.5em',
  },
  presets: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  create: {
    margin: '0.25em',
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

export function Lobby(props: { globalSize: number }) {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);

  const enterSinglePlayer = () => {
    setAuth({});
    navigate('/app');
  }

  const createGame = async (preset: string) => {
    const playerName = checkForPlayerName();
    if (playerName) {
      // Create Match on Server
      const { matchID } = await lobbyClient.createMatch('blank-white-cards', {
        unlisted: true,
        numPlayers: 1000,
        setupData: {
          presetDeck: preset || 'blank',
        }
      });

      if (matchID.match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/)) {
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
      if (roomCode.value.toUpperCase().match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/)) {
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

  return (
    <wired-dialog open>
      <div style={styles.dialog}>
        <MultiplayerLobby createGame={createGame} joinGame={joinGame} auth={auth}></MultiplayerLobby>
        <wired-card style={styles.singleplayer} onClick={enterSinglePlayer}>
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

interface MultiplayerLobbyProps {
  createGame: (preset: string ) => void;
  joinGame: () => void;
  auth: AuthType | undefined;
}

export function MultiplayerLobby({ createGame, joinGame, auth }: MultiplayerLobbyProps) {
  return (
    <wired-card style={styles.multiplayer}>
      <div style={styles.heading}><Icon name="multi" />&nbsp;Multiplayer</div>
      <wired-input style={styles.name} id="nameInput" placeholder="Player Name" maxlength={25} value={auth?.playerName}></wired-input>
      <div>and</div>
      <div style={styles.rooms}>
        <wired-input style={styles.code} id="roomInput" placeholder="Room Code" maxlength={4} value={auth?.matchID}></wired-input>
        <wired-card style={styles.enter} onClick={joinGame}>Join</wired-card>
      </div>
      <div>or</div>
      <div style={styles.presets}>
        <div style={styles.subheading}>Create a New Game from</div>
        <wired-card style={styles.create} onClick={ () => { createGame('blank'); }}>
          Blank White Cards
        </wired-card>
        <wired-card style={styles.create} onClick={ () => { createGame('global'); }}>
          Global Deck Cards
        </wired-card>
      </div>
    </wired-card>
  )
}