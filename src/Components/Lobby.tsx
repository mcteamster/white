import { useNavigate } from "react-router";
import { Properties } from 'csstype';
import { Icon } from './Icons';
import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext, HotkeysContext } from "../lib/contexts";
import { lobbyClients, getRegion } from "../lib/clients";
import { externalLink } from "../lib/hooks";
import { discordSdk } from "../lib/discord";
import discordLogo from '../assets/discord.svg';

const styles: { [key: string]: Properties<string | number> } = {
  title: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.75em',
  },
  dialog: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiplayer: {
    width: 'min(40vh, 85vw)',
    minWidth: '300px',
    minHeight: 'min(33vh, 85vw)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  singleplayer: {
    width: 'min(40vh, 85vw)',
    minWidth: '300px',
    minHeight: 'min(33vh, 85vw)',
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
    alignItems: 'center',
    fontSize: "2em",
  },
  subheading: {
    margin: '0.25em 0 0 0',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    fontSize: "1.25em",
  },
  flavourbox: {
    maxWidth: '15em',
    margin: '0.25em 0',
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
    width: '3em',
    margin: '0 0 0 0.25em'
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
  region: {
    width: '3em',
    margin: '0.25em',
    backgroundColor: '#eee',
    borderRadius: '0.5em',
    fontSize: '1.25em',
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
  discord: {
    width: '0.8em',
    height: '0.8em',
    padding: '0.1em',
    border: '1.5pt solid black',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }
}

interface LobbyProps {
  globalSize: number;
  region: 'AP' | 'EU' | 'NA' | 'default';
  setRegion: (region: 'AP' | 'EU' | 'NA' | 'default') => void;
}

export function Lobby({ globalSize, region, setRegion }: LobbyProps) {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);
  const [stage, setStage] = useState('landing');
  const [joining, setJoining] = useState(false);
  const [preset, setPreset] = useState('blank');

  const enterSinglePlayer = () => {
    setAuth({});
    navigate('/app');
  }

  const checkForPlayerName = useCallback(() => {
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
  }, [])

  const roomCodeError = useCallback(() => {
    setAuth({});
    const roomCode = (document.getElementById("roomInput") as HTMLInputElement);
    roomCode.value = "";
    roomCode.style.color = 'red';
    (document.getElementById('flavourbox') as HTMLElement).style.color = 'red';
    setTimeout(() => {
      roomCode.style.color = 'black';
      (document.getElementById('flavourbox') as HTMLElement).style.color = 'black';
    }, 500)
  }, [setAuth])

  const createGame = useCallback(async (preset: string) => {
    const playerName = checkForPlayerName();
    if (playerName) {
      // Create Match on Server
      const { matchID } = await lobbyClients[region].createMatch('blank-white-cards', {
        unlisted: true,
        numPlayers: 100, // TODO: What is a realistic upper bound?
        setupData: {
          presetDeck: preset || 'blank',
        }
      });

      if (matchID.match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/)) {
        if (localStorage.getItem('instance_id')) {
          // Set room for Discord
          fetch(`https://api.mcteamster.com/common/rooms/${localStorage.getItem('instance_id')}/${matchID}?game=white`, {
            method: "PUT",
          })
        } else if (import.meta.env.VITE_ORIGIN == 'https://blankwhite.cards') {
          // Track room for official instance
          fetch(`https://api.mcteamster.com/common/rooms/${new Date().getTime()}/${matchID}?game=white`, {
            method: "PUT",
          })
        }

        // Join Match as playerID 0
        const { playerCredentials } = await lobbyClients[region].joinMatch(
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
  }, [navigate, setAuth, checkForPlayerName, region])

  const joinGame = useCallback(async () => {
    const playerName = checkForPlayerName();
    if (playerName) {
      const roomCode = (document.getElementById("roomInput") as HTMLInputElement);
      if (roomCode.value.toUpperCase().match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/)) {
        setRegion(getRegion(roomCode.value.toUpperCase()))
        const lobbyClient = lobbyClients[getRegion(roomCode.value.toUpperCase())];
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
  }, [navigate, setAuth, checkForPlayerName, roomCodeError, setRegion])

  const checkForRoomCode = useCallback(() => {
    const roomCode = (document.getElementById("roomInput") as HTMLInputElement);
    if (roomCode.value && roomCode.value.toUpperCase().match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/)) {
      setRegion(getRegion(roomCode.value.toUpperCase()))
      const lobbyClient = lobbyClients[getRegion(roomCode.value.toUpperCase())];
      lobbyClient.getMatch('blank-white-cards', roomCode.value.toUpperCase()).then(async () => {
        setAuth({ ...auth, matchID: roomCode.value.toUpperCase() });
        setStage('join');
      }).catch(() => {
        roomCodeError();
      });
    } else {
      roomCodeError();
    }
  }, [auth, setAuth, roomCodeError, setRegion])

  const checkLobbyConnection = useCallback(() => {
    const roomCode = (document.getElementById("roomInput") as HTMLInputElement);
    const lobbyMatches = Object.keys(lobbyClients).map((server) => {
      const key = server as ('AP' | 'EU' | 'NA' | 'default')
      return lobbyClients[key].listMatches('blank-white-cards');
    })
    Promise.any(lobbyMatches).then(() => {
      if (roomCode.value) {
        checkForRoomCode();
      } else {
        setStage('landing');
      }
    }).catch(() => {
      setStage('down');
      setTimeout(checkLobbyConnection, 30000);
    });
  }, [setStage, checkForRoomCode]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(checkLobbyConnection, []);

  // Hotkeys
  const { hotkeys } = useContext(HotkeysContext);
  useEffect(() => {
    if (hotkeys.enter) {
      if (stage == 'landing') {
        checkForRoomCode();
      } else if (stage == 'join') {
        joinGame();
      } else if (stage == 'create') {
        createGame(preset);
      }
    }
  }, [hotkeys, preset, stage, checkForRoomCode, createGame, joinGame])

  return (
    <wired-dialog open>
      <div style={styles.title}><Icon name='copy' />&nbsp;Blank White Cards</div>
      <Notices region={region}/>
      <div style={styles.dialog}>
        <wired-card style={styles.multiplayer}>
          <div style={styles.heading}>
            <Icon name="multi" />&nbsp;
            Multiplayer&nbsp;
            {
              !discordSdk &&
              <a href='https://discord.com/discovery/applications/1389508624774201395' target='_blank' style={styles.discord}>

                <img height='20pt' width='20pt' src={discordLogo} /><br></br>
              </a>
            }
          </div>
          <div style={{ display: (stage == 'down') ? undefined : 'none' }}>
            <div style={styles.subheading}>Servers Currently Unavailable</div>
          </div>

          <div style={{ display: (stage == 'landing') ? undefined : 'none' }}>
            <wired-card style={{ ...styles.action, fontSize: '1.5em' }} onClick={() => { setStage('create-setup') }}>
              Create New Game
            </wired-card>
            <div>or</div>
            <div style={styles.textentry}>
              <wired-card style={styles.action} onClick={() => { checkForRoomCode() }}>
                Join Room
                <wired-input style={styles.code} id="roomInput" placeholder="&nbsp;Code" maxlength={4} value={auth?.matchID} onClick={(e) => e.stopPropagation()}></wired-input>
              </wired-card>
            </div>
          </div>

          <div style={{ display: (stage == 'join') ? undefined : 'none' }}>
            <div style={styles.subheading}>Joining Room</div>
            <wired-card style={{ ...styles.code, fontSize: '1.5em', color: 'grey' }}>{auth?.matchID}</wired-card>
          </div>

          <div style={{ ...styles.presets, display: (stage == 'create-setup') ? undefined : 'none' }}>
            <div style={styles.subheading}>Select a Starting Deck</div>
            <wired-card style={{ ...styles.action, backgroundColor: (preset == 'blank') ? '#eee' : undefined }} onClick={() => { setPreset('blank'); }}><Icon name="copy" />Blank</wired-card>
            <wired-card style={{ ...styles.action, backgroundColor: (preset == 'global') ? '#eee' : undefined }} onClick={() => { setPreset('global'); }}><Icon name="global" />Global</wired-card>
            <wired-card style={{ ...styles.action, backgroundColor: (preset == 'standard') ? '#eee' : undefined }} onClick={() => { setPreset('standard'); }}><Icon name="die" />Standard</wired-card>
            <div style={styles.flavourbox}>
              {preset == 'blank' && 'A blank deck to create your own game. Save and Load to continue the fun!'}
              {preset == 'global' && `A copy of the ${globalSize} card global deck. (Cards made here are not submitted)`}
              {preset == 'standard' && 'The standard 52 card deck for more traditional games.'}
            </div>
            <div style={{ ...styles.presets }}>
              <wired-card style={styles.action} onClick={() => { roomCodeError(); setStage('landing') }}><Icon name="back" />Back</wired-card>
              <wired-card style={styles.action} onClick={() => { roomCodeError(); setStage('create') }}><Icon name="done" />Confirm</wired-card>
            </div>
          </div>

          <div style={{ ...styles.presets, display: (stage == 'create') ? undefined : 'none' }}>
            <div style={styles.subheading}>Choose Region</div>
            {
              import.meta.env.VITE_MULTI_REGION == 'true' ?
              <>
                <wired-card style={{ ...styles.region, backgroundColor: (region == 'NA') ? '#eee' : undefined }} onClick={() => { setRegion('NA'); }}>America</wired-card>
                <wired-card style={{ ...styles.region, backgroundColor: (region == 'EU') ? '#eee' : undefined }} onClick={() => { setRegion('EU'); }}>Europe</wired-card>
                <wired-card style={{ ...styles.region, backgroundColor: (region == 'AP') ? '#eee' : undefined }} onClick={() => { setRegion('AP'); }}>Asia</wired-card>
              </>
              : <wired-card style={{ ...styles.region, backgroundColor: (region == 'default') ? '#eee' : undefined }} onClick={() => { setRegion('default'); }}>LAN</wired-card>
            }
          </div>

          <div style={{ display: (['join', 'create'].includes(stage)) ? undefined : 'none' }}>
            <div style={styles.subheading}>Who's Playing?</div>
            <wired-input style={{ ...styles.name, display: (['join', 'create'].includes(stage)) ? undefined : 'none' }} id="nameInput" placeholder="Player Name" maxlength={25} value={auth?.playerName}></wired-input>
            <div style={{ ...styles.presets }}>
              <wired-card style={styles.action} onClick={() => {
                roomCodeError();
                if (stage == 'join') {
                  setStage('landing');
                } else if (stage == 'create') {
                  setStage('create-setup')
                };
              }}><Icon name="back" />Back</wired-card>
              <wired-card id='enterGameButton' style={styles.action} onClick={() => {
                if (!joining) {
                  if (stage == 'join') {
                    setJoining(true);
                    joinGame();
                  } else if (stage == 'create') {
                    setJoining(true);
                    createGame(preset);
                  };
                  setTimeout(() => {
                    const enterGameButton = document.getElementById('enterGameButton') as HTMLElement;
                    enterGameButton.style.color = 'red';
                    setTimeout(() => {
                      enterGameButton.style.color = 'black';
                      setJoining(false);
                    }, 500)
                  }, 3000)
                }
              }}>
                {
                  joining ?
                  <>
                    <div className="spin"><Icon name="loading" /></div>
                    Joining
                  </> :
                  <>
                    <Icon name="play" />
                    Play
                  </>
                }
              </wired-card>
            </div>
          </div>
        </wired-card>
        {
          (stage == 'landing' || stage == 'down') &&
          <wired-card style={styles.singleplayer}>
            <div style={styles.heading}><Icon name="single" />&nbsp;Single Device</div>
            <div style={styles.subheading}>Using the Global Deck</div>
            <wired-card style={styles.action} onClick={enterSinglePlayer}>
              <div style={{ ...styles.heading, padding: '0 0.25em' }}>Play Now</div>
              <div >{globalSize} Cards</div>
            </wired-card>
            <div style={styles.subheading}>Draw and add your own!</div>
          </wired-card>
        }
      </div>
      <div style={styles.terms}>
        <div>by continuing you confirm you are over 18</div>
        <div>and accept our <u onClick={() => { externalLink("https://blankwhite.cards/about") }}>Terms of Service</u></div>
      </div>
    </wired-dialog>
  );
}

interface NoticesProps {
  region: 'AP' | 'EU' | 'NA' | 'default';
}

interface Notice {
  id?: string;
  message?: string;
  regions?: string[];
}

function Notices(props: NoticesProps) {
  const [notice, setNotice] = useState<Notice>({});

  const styles: { [key: string]: Properties<string | number> } = {
    notice: {
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }

  const checkNotices = useCallback(async () => {
    try {
      const data = await (await fetch(`${import.meta.env.VITE_API_SERVER}/common/notices/white`)).json()
      setNotice(data)
    } catch (err) {
      console.warn('Error fetching notices', err)
    }
  }, [])
  
  useEffect(() => {
    checkNotices();
  }, [checkNotices])

  if (notice.regions && (notice.regions.length == 0 || notice?.regions.includes(props.region))) {
    return <div style={styles.notice}>{notice.message}</div>
  }
}