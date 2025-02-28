import { useNavigate } from "react-router";
import { Properties } from 'csstype';
import { Icon } from './Icons';
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../lib/contexts";
import { lobbyClient } from "../lib/clients";

const styles: { [key: string]: Properties<string | number> } = {
  dialog: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiplayer: {
    width: 'min(40vh, 85vw)',
    height: 'min(40vh, 85vw)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  singleplayer: {
    width: 'min(40vh, 85vw)',
    height: 'min(30vh, 85vw)',
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
    margin: '0.25em 0 0 0',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    fontSize: "1.25em",
  },
  name: {
    width: '12em',
  },
  textentry: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  code: {
    fontSize: '1.25em',
    width: '5em',
  },
  button: {
    fontSize: '1.25em',
    width: "2em",
    height: '1.5em',
    margin: '0.25em',
    backgroundColor: '#eee',
    borderRadius: '0.5em',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presets: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  action: {
    minWidth: '3.5em',
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
  },
}

export function Lobby(props: { globalSize: number }) {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);
  const [stage, setStage] = useState('landing');
  const [preset, setPreset] = useState('blank');

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
        numPlayers: 100, // TODO: what is realistic?
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

  const checkForRoomCode = () => {
    const roomCode = (document.getElementById("roomInput") as HTMLInputElement);
    if (roomCode.value && roomCode.value.toUpperCase().match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/)) {
      lobbyClient.getMatch('blank-white-cards', roomCode.value.toUpperCase()).then(async () => {
        setAuth({ ...auth, matchID: roomCode.value.toUpperCase() });
        setStage('join');
      }).catch(() => {
        roomCodeError();
      });
    } else {
      roomCodeError();
    }
  }

  const checkLobbyConnection = () => {
    lobbyClient.listMatches('blank-white-cards').then(() => {
      setStage('landing');
    }).catch(() => {
      setStage('down');
      setTimeout(checkLobbyConnection, 30000);
    });
  }
  useEffect(checkLobbyConnection);

  return (
    <wired-dialog open>
      <div style={styles.dialog}>
        <wired-card style={styles.multiplayer}>
          <div style={{ display: (stage == 'down') ? undefined : 'none' }}>
            <div style={styles.heading}><Icon name="multi" />&nbsp;Multiplayer</div>
            <div style={styles.subheading}>Server Currently Unavailable</div>
          </div>

          <div style={{ display: (stage == 'landing') ? undefined : 'none' }}>
            <div style={styles.heading}><Icon name="multi" />&nbsp;Multiplayer</div>
            <div style={styles.subheading}>Join by Room Code</div>
            <div style={styles.textentry}>
              <wired-input style={styles.code} id="roomInput" placeholder="Room Code" maxlength={4} value={auth?.matchID}></wired-input>
              <wired-card style={styles.button} onClick={() => { checkForRoomCode() }}><Icon name='send' /></wired-card>
            </div>
            <div>or</div>
            <wired-card style={{...styles.action, fontSize: '1.5em'}} onClick={() => { setStage('create') }}>
              Create New Game
            </wired-card>
          </div>

          <div style={{ display: (stage == 'join') ? undefined : 'none' }}>
            <div style={styles.subheading}>Joining Room</div>
            <wired-card style={{ ...styles.code, color: 'grey' }}>{auth?.matchID}</wired-card>
          </div>

          <div style={{ ...styles.presets, display: (stage == 'create') ? undefined : 'none' }}>
            <wired-card style={{...styles.action, backgroundColor: (preset == 'blank') ? '#eee' : undefined }} onClick={() => { setPreset('blank'); }}><Icon name="copy" />Blank</wired-card>
            <wired-card style={{...styles.action, backgroundColor: (preset == 'global') ? '#eee' : undefined }} onClick={() => { setPreset('global'); }}><Icon name="global" />Global</wired-card>
          </div>

          <div style={{ display: (['join', 'create'].includes(stage)) ? undefined : 'none' }}>
            <div style={styles.subheading}>Who's Playing?</div>
            <wired-input style={{ ...styles.name, display: (['join', 'create'].includes(stage)) ? undefined : 'none' }} id="nameInput" placeholder="Player Name" maxlength={25} value={auth?.playerName}></wired-input>
            <div style={{ ...styles.presets}}>
              <wired-card style={styles.action} onClick={() => { setStage('landing') }}><Icon name="back" />Back</wired-card>
              <wired-card style={styles.action} onClick={() => {
                if (stage == 'join') {
                  joinGame(); 
                } else if (stage == 'create') {
                  createGame(preset);
                };
              }}><Icon name="play" />Play</wired-card>
            </div>
          </div>
        </wired-card>
        <wired-card style={styles.singleplayer}>
          <div style={styles.heading}><Icon name="single" />&nbsp;Single Device</div>
          <div style={styles.subheading}>Draw and add your own cards!</div>
          <wired-card style={styles.action} onClick={enterSinglePlayer}>
            <Icon name='global' />
            <div style={styles.subheading}>Global Deck: {props.globalSize}</div>
          </wired-card>
        </wired-card>
      </div>
      <div style={styles.terms}>
        <div>by continuing you confirm you are over 18</div>
        <div>and accept our <a href='/about' target="_blank"><u>Terms of Service</u></a></div>
      </div>
    </wired-dialog>
  );
}
