import { useNavigate } from "react-router";
import { Properties } from 'csstype';
import { Icon } from './Icons';
import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext, HotkeysContext } from "../lib/contexts";
import { getLobbyClient, getRegion, getCustomServer, setCustomServer, clearCustomServer, resolveCustomServer } from "../lib/clients";
import type { Region } from "../lib/clients";
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
    flexBasis: '100%',
    margin: '0.25em 0',
    textAlign: 'center',
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
    flexWrap: 'wrap',
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

function CustomServerInput({ id, onConnect, autoFocus }: { id: string; onConnect: () => void; autoFocus?: boolean }) {
  const saved = getCustomServer();
  const defaultValue = saved !== 'http://localhost:3000' ? saved : '';

  useEffect(() => {
    setTimeout(() => {
      const el = document.getElementById(id) as HTMLInputElement;
      const inner = el?.shadowRoot?.querySelector('input') as HTMLInputElement;
      if (defaultValue) {
        if (inner) inner.value = defaultValue;
        else if (el) el.value = defaultValue;
      }
    }, 50);
  }, []);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => {
        const el = document.getElementById(id) as HTMLInputElement;
        const inner = el?.shadowRoot?.querySelector('input') as HTMLInputElement;
        if (inner) inner.focus();
        else if (el) el.focus();
      }, 50);
    }
  }, [autoFocus]);

  return (
    <>
      <div style={{ width: '100%', margin: '0.25em 0', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <wired-input
          id={id}
          placeholder="http://localhost:3000"
          style={{ width: '12em' }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') onConnect();
          }}
          onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
            const val = (e.target as HTMLInputElement).value || (e.target?.shadowRoot?.querySelector('input') as HTMLInputElement)?.value;
            if (val) setCustomServer(val);
          }}
        ></wired-input>
        <span style={{ cursor: 'pointer', fontSize: '1.5em', color: '#000', marginLeft: '0.25em' }} onClick={() => {
          const input = document.getElementById(id) as HTMLInputElement;
          const inner = input?.shadowRoot?.querySelector('input') as HTMLInputElement;
          if (inner) inner.value = '';
          if (input) input.value = '';
          clearCustomServer();
        }}>×</span>
      </div>
      <div style={{ fontSize: '1em', margin: '0.5em 0', textAlign: 'center' }}>Custom servers are not managed by Blank White Cards. Connect at your own risk.</div>
    </>
  );
}

interface LobbyProps {
  globalSize: number;
  deckLoading: boolean;
  region: Region;
  setRegion: (region: Region) => void;
}

export function Lobby({ globalSize, deckLoading, region, setRegion }: LobbyProps) {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);
  const [stage, setStage] = useState('landing');
  const [joining, setJoining] = useState(false);
  const [preset, setPreset] = useState('blank');
  const [connecting, setConnecting] = useState(false);

  const connectCustomServer = useCallback(() => {
    if (connecting) return;
    setConnecting(true);
    const input = document.getElementById('customServerCreateInput') as HTMLInputElement;
    const val = (input?.shadowRoot?.querySelector('input') as HTMLInputElement)?.value || input?.value || getCustomServer();
    resolveCustomServer(val).then((resolvedUrl) => {
      setCustomServer(resolvedUrl);
      const inner = input?.shadowRoot?.querySelector('input') as HTMLInputElement;
      if (inner) inner.value = resolvedUrl;
      else if (input) input.value = resolvedUrl;
      return getLobbyClient('custom').listMatches('blank-white-cards');
    }).then(() => {
      setStage('create-deck');
    }).catch(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById('customServerCreateInput') as HTMLElement;
        if (el) {
          el.style.color = 'red';
          setTimeout(() => { el.style.color = ''; }, 1000);
        }
      });
    }).finally(() => {
      setConnecting(false);
    });
  }, [connecting]);

  const connectJoinServer = useCallback(() => {
    if (connecting) return;
    const roomInput = document.getElementById('customServerRoomInput') as HTMLInputElement;
    const urlInput = document.getElementById('customServerJoinInput') as HTMLInputElement;
    const roomVal = ((roomInput?.shadowRoot?.querySelector('input') as HTMLInputElement)?.value || roomInput?.value || '').toUpperCase();
    const urlVal = (urlInput?.shadowRoot?.querySelector('input') as HTMLInputElement)?.value || urlInput?.value || getCustomServer();

    // Validate room code format
    if (!roomVal.match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/)) {
      roomInput.style.color = 'red';
      setTimeout(() => { roomInput.style.color = ''; }, 500);
      return;
    }

    setConnecting(true);
    resolveCustomServer(urlVal).then((resolvedUrl) => {
      setCustomServer(resolvedUrl);
      const inner = urlInput?.shadowRoot?.querySelector('input') as HTMLInputElement;
      if (inner) inner.value = resolvedUrl;
      else if (urlInput) urlInput.value = resolvedUrl;
      setAuth({ ...auth, matchID: roomVal });
      // First validate server is reachable, then look up the room
      return getLobbyClient('custom').listMatches('blank-white-cards').then(() => {
        return getLobbyClient('custom').getMatch('blank-white-cards', roomVal).then(() => {
          setStage('join');
        }).catch(() => {
          // Server is reachable but room not found
          requestAnimationFrame(() => {
            const room = document.getElementById('customServerRoomInput') as HTMLElement;
            if (room) {
              room.style.color = 'red';
              setTimeout(() => { room.style.color = ''; }, 1000);
            }
          });
        });
      });
    }).catch(() => {
      // Server unreachable
      requestAnimationFrame(() => {
        const el = document.getElementById('customServerJoinInput') as HTMLElement;
        if (el) {
          el.style.color = 'red';
          setTimeout(() => { el.style.color = ''; }, 1000);
        }
      });
    }).finally(() => {
      setConnecting(false);
    });
  }, [connecting, auth, setAuth]);

  const enterSinglePlayer = () => {
    setAuth({});
    navigate('/app');
  }

  const checkForPlayerName = useCallback(() => {
    const playerName = (document.getElementById("nameInput") as HTMLInputElement);
    if (!playerName.value) {
      playerName.style.color = 'red';
      const flavourbox = document.getElementById('flavourbox');
      if (flavourbox) flavourbox.style.color = 'red';
      setTimeout(() => {
        playerName.style.color = 'black';
        if (flavourbox) flavourbox.style.color = 'black';
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
    const flavourbox = document.getElementById('flavourbox');
    if (flavourbox) flavourbox.style.color = 'red';
    setTimeout(() => {
      roomCode.style.color = 'black';
      if (flavourbox) flavourbox.style.color = 'black';
    }, 500)
  }, [setAuth])

  const createGame = useCallback(async (preset: string) => {
    const playerName = checkForPlayerName();
    if (playerName) {
      // Create Match on Server
      const { matchID } = await getLobbyClient(region).createMatch('blank-white-cards', {
        unlisted: true,
        numPlayers: 100, // TODO: What is a realistic upper bound?
        setupData: {
          presetDeck: preset || 'blank',
        }
      });

      if (matchID.match(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/)) {
        if (localStorage.getItem('instance_id')) {
          // Set room for Discord
          fetch(`${import.meta.env.VITE_API_SERVER}/common/rooms/${localStorage.getItem('instance_id')}/${matchID}?game=white`, {
            method: "PUT",
          })
        } else if (import.meta.env.VITE_ORIGIN == 'https://blankwhite.cards') {
          fetch(`${import.meta.env.VITE_API_SERVER}/common/rooms/${matchID}/${matchID}?game=white`, {
            method: "PUT",
          })
        }

        // Join Match as playerID 0
        const { playerCredentials } = await getLobbyClient(region).joinMatch(
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
        const lobbyClient = getLobbyClient(getRegion(roomCode.value.toUpperCase()));
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
      const detectedRegion = getRegion(roomCode.value.toUpperCase());
      setRegion(detectedRegion);
      if (detectedRegion === 'custom') {
        if (discordSdk) {
          // Custom servers not supported inside Discord
          roomCode.style.color = 'red';
          setTimeout(() => { roomCode.style.color = ''; }, 500);
          return;
        }
        // Custom server — prompt for URL before connecting
        setAuth({ ...auth, matchID: roomCode.value.toUpperCase() });
        setStage('custom-server');
        return;
      }
      const lobbyClient = getLobbyClient(detectedRegion);
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
    const lobbyMatches = (['AP', 'EU', 'NA'] as const).map((server) => {
      return getLobbyClient(server).listMatches('blank-white-cards');
    })
    Promise.any(lobbyMatches).then(() => {
      if (roomCode.value) {
        checkForRoomCode();
      } else {
        setStage('landing');
      }
    }).catch(() => {
      if (discordSdk) {
        setStage('down');
        setTimeout(checkLobbyConnection, 30000);
      } else {
        setStage('landing');
      }
    });
  }, [setStage, checkForRoomCode]);
  useEffect(checkLobbyConnection, []);

  // Hotkeys
  const { hotkeys } = useContext(HotkeysContext);
  useEffect(() => {
    if (hotkeys.enter) {
      if (stage == 'landing' || stage == 'down') {
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

                <img style={{ height: '1.25rem', width: '1.25rem' }} src={discordLogo} /><br></br>
              </a>
            }
          </div>

          {stage === 'down' && (
            <div style={{ ...styles.subheading, fontSize: '0.85em' }}>Public servers unavailable</div>
          )}

          <div style={{ display: (stage == 'landing' || stage == 'down') ? undefined : 'none' }}>
            <wired-card style={{ ...styles.action, fontSize: '1.5em' }} onClick={() => { setStage('create-region') }}>
              Create New Game
            </wired-card>
            <div>or</div>
            <div style={styles.textentry}>
              <wired-card style={styles.action} onClick={() => { checkForRoomCode() }}>
                Join Code
                <wired-input style={styles.code} id="roomInput" placeholder="&nbsp;Room" maxlength={4} value={auth?.matchID} onClick={(e) => e.stopPropagation()}></wired-input>
              </wired-card>
            </div>
          </div>

          <div style={{ display: (stage == 'join') ? undefined : 'none' }}>
            <div style={styles.subheading}>Joining Room</div>
            <wired-card style={{ ...styles.code, fontSize: '1.5em', color: 'grey' }}>{auth?.matchID}</wired-card>
          </div>

          {/* Step 1: Choose Region */}
          <div style={{ ...styles.presets, display: (stage == 'create-region') ? undefined : 'none' }}>
            <div style={styles.subheading}>Choose Region</div>
            {
              import.meta.env.VITE_MULTI_REGION == 'true' &&
              <>
                <wired-card style={{ ...styles.region, backgroundColor: (region == 'NA') ? '#eee' : undefined }} onClick={() => { setRegion('NA'); }}><Icon name="global" />America</wired-card>
                <wired-card style={{ ...styles.region, backgroundColor: (region == 'EU') ? '#eee' : undefined }} onClick={() => { setRegion('EU'); }}><Icon name="global" />Europe</wired-card>
                <wired-card style={{ ...styles.region, backgroundColor: (region == 'AP') ? '#eee' : undefined }} onClick={() => { setRegion('AP'); }}><Icon name="global" />Asia</wired-card>
              </>
            }
            {!discordSdk && <wired-card style={{ ...styles.region, backgroundColor: (region == 'custom') ? '#eee' : undefined }} onClick={() => { setRegion('custom'); }}><Icon name="settings" />Custom</wired-card>}
            {region === 'custom' && (
              <CustomServerInput id="customServerCreateInput" onConnect={connectCustomServer} autoFocus={region === 'custom' && stage === 'create-region'} />
            )}
            <div style={{ ...styles.presets }}>
              <wired-card style={styles.action} onClick={() => { roomCodeError(); setStage('landing') }}><Icon name="back" />Back</wired-card>
              <wired-card style={styles.action} onClick={() => {
                if (region === 'custom') {
                  connectCustomServer();
                } else {
                  setStage('create-deck');
                }
              }}>{connecting ? <div className="spin"><Icon name="loading" /></div> : <Icon name="done" />}Confirm</wired-card>
            </div>
          </div>

          {/* Step 2: Select Deck */}
          <div style={{ ...styles.presets, display: (stage == 'create-deck') ? undefined : 'none' }}>
            <div style={styles.subheading}>Select a Starting Deck</div>
            <wired-card style={{ ...styles.action, backgroundColor: (preset == 'blank') ? '#eee' : undefined }} onClick={() => { setPreset('blank'); }}><Icon name="copy" />Blank</wired-card>
            <wired-card style={{ ...styles.action, backgroundColor: (preset == 'global') ? '#eee' : undefined }} onClick={() => { setPreset('global'); }}><Icon name="global" />Global</wired-card>
            <wired-card style={{ ...styles.action, backgroundColor: (preset == 'standard') ? '#eee' : undefined }} onClick={() => { setPreset('standard'); }}><Icon name="die" />Standard</wired-card>
            <wired-card style={{ ...styles.action, backgroundColor: (preset == 'party-2026') ? '#eee' : undefined }} onClick={() => { setPreset('party-2026'); }}><Icon name="party" />Party</wired-card>
            <div style={styles.flavourbox}>
              {preset == 'blank' && (
                <div>
                  A blank deck to create your own game. Save, Edit, and Load to continue the fun!
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <wired-card style={{ ...styles.action, fontSize: '0.9em' }} onClick={() => { externalLink('https://blankwhite.cards/editor'); }}>
                      Open Deck Editor
                    </wired-card>
                  </div>
                </div>
              )}
              {preset == 'global' && `A copy of the ${globalSize} card global deck. (Cards made here are not submitted)`}
              {preset == 'standard' && 'The standard 52 card deck for more traditional games.'}
              {preset == 'party-2026' && 'A curated 100 card party deck — dares, chaos mechanics, and social fun.'}
            </div>
            <div style={{ ...styles.presets }}>
              <wired-card style={styles.action} onClick={() => { roomCodeError(); setStage('create-region') }}><Icon name="back" />Back</wired-card>
              <wired-card style={styles.action} onClick={() => { roomCodeError(); setStage('create') }}><Icon name="done" />Confirm</wired-card>
            </div>
          </div>


          {/* Custom server prompt (join flow — TVWXZ room codes) */}
          <div style={{ ...styles.presets, display: (stage == 'custom-server') ? undefined : 'none' }}>
            <div style={styles.subheading}>Room Code</div>
            <div style={styles.textentry}>
              <wired-input style={{ ...styles.code, fontSize: '1.5em', margin: 0 }} id="customServerRoomInput" placeholder="Room" maxlength={4} value={auth?.matchID} key={`room-${auth?.matchID}`} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') connectJoinServer(); }}></wired-input>
            </div>
            <div style={styles.subheading}>Custom Server</div>
            <CustomServerInput id="customServerJoinInput" onConnect={connectJoinServer} autoFocus={stage === 'custom-server'} />
            <div style={{ ...styles.presets }}>
              <wired-card style={styles.action} onClick={() => {
                setAuth({});
                setStage('landing');
              }}><Icon name="back" />Back</wired-card>
              <wired-card style={styles.action} onClick={() => {
                connectJoinServer();
              }}>{connecting ? <div className="spin"><Icon name="loading" /></div> : <Icon name="play" />}Connect</wired-card>
            </div>
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
                  setStage('create-deck');
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
                    if (enterGameButton) {
                      enterGameButton.style.color = 'red';
                      setTimeout(() => {
                        enterGameButton.style.color = 'black';
                        setJoining(false);
                      }, 500)
                    }
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
            <wired-card 
              style={{
                ...styles.action,
                opacity: deckLoading ? 0.5 : 1,
                cursor: deckLoading ? 'not-allowed' : 'pointer'
              }} 
              onClick={deckLoading ? undefined : enterSinglePlayer}
            >
              <div style={{ ...styles.heading, padding: '0 0.25em' }}>Play Now</div>
              <div>{`${globalSize} Cards`}</div>
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
  region: Region;
}

interface Notice {
  id?: string;
  messages?: Record<string, string>;
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

  if (notice.messages) {
    const message = notice.messages[props.region] ?? notice.messages.ALL ?? ''
    return <div style={styles.notice}>{message}</div>
  }
}