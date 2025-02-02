import { Properties } from 'csstype';
import { Icon } from './Icons';
import { LobbyClient } from 'boardgame.io/client';
const lobbyClient = new LobbyClient({ server: (import.meta.env.MODE === 'development' ? 'http://localhost:8000' : 'https://blankwhitecards.mcteamster.com') });

export function Lobby(props: any) {
  const enterSinglePlayer = () => {
    props.setMatchID(undefined);
    props.setPlayerID(undefined);
    props.setCredentials(undefined);
    closeLobby();
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
      props.setMatchID(matchID);

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
        props.setPlayerID("0");
        props.setCredentials(playerCredentials);
        window.history.replaceState(null, "Blank White Cards", `/${matchID}`)
        closeLobby();
      }
    }
  }

  const joinGame = async () => {
    const playerName = checkForPlayerName();
    if (playerName) {
      const roomCode = (document.getElementById("roomInput") as HTMLInputElement);

      if (roomCode.value.toUpperCase().match(/^[BCDFGHJKLMNPQRSTVWXYZ]{4}$/)) {
        props.setMatchID(roomCode.value.toUpperCase());
        try {
          const { playerID, playerCredentials } = await lobbyClient.joinMatch(
            'blank-white-cards',
            roomCode.value.toUpperCase(),
            {
              playerName,
            }
          );
          props.setPlayerID(playerID);
          props.setCredentials(playerCredentials);
          window.history.replaceState(null, "Blank White Cards", `/${roomCode.value.toUpperCase()}`);
          closeLobby();
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
    const roomCode = (document.getElementById("roomInput") as HTMLInputElement);
    props.setMatchID(undefined);
    props.setPlayerID(undefined);
    props.setCredentials(undefined);
    roomCode.value = "";
    roomCode.style.color = 'red';
    (document.getElementById('flavourbox') as HTMLElement).style.color = 'red';
    setTimeout(() => {
      roomCode.style.color = 'black';
      (document.getElementById('flavourbox') as HTMLElement).style.color = 'black';
    }, 500)
  }

  const closeLobby = () => {
    props.setLobbyOpen(false)
  }

  const parsePathCode = () => {
    const pathname = window.location.pathname;
    if (pathname.match(/^\/[A-Za-z]{4}$/)) {
      return pathname.slice(1,5).toUpperCase();
    } else {
      return
    }
  }
  
  const styles: { [key: string]: Properties<string | number> } = {
    dialog: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '1.25em',
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
      fontSize: "1.5em",
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
      width: '4.5em',
    },
    enter: {
      width: "1em",
      height: '1em',
      margin: '0.25em',
      backgroundColor: '#eee',
      borderRadius: '0.5em',
    },
    create: {
      backgroundColor: '#eee',
      borderRadius: '0.5em',
    },
  }

  return (
    <wired-dialog open={props.lobbyOpen || undefined}>
      <div style={styles.dialog}>
        <wired-card style={styles.mode}>
          <div style={styles.heading}><Icon name="multi"/>&nbsp;Multiplayer</div>
          <wired-input style={styles.name} id="nameInput" placeholder="Player Name" maxlength={25}></wired-input>
          <div>and</div>
          <div style={styles.rooms}>
            <wired-input style={styles.code} id="roomInput" placeholder="Room Code" maxlength={4} value={parsePathCode()}></wired-input>
            <wired-card style={styles.enter} onClick={joinGame}><Icon name="done"/></wired-card>
          </div>
          <div>or</div>
          <wired-card style={styles.create} onClick={createGame}>Create Game</wired-card>
        </wired-card>
        <wired-card style={styles.mode} onClick={enterSinglePlayer}>
          <Icon name="single"/>
          <div style={styles.heading}>Singleplayer</div>
          (or local pass-and-play)
        </wired-card>
      </div>
    </wired-dialog>
  );
}