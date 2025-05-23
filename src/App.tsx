// Blank White Cards React App
import { BrowserRouter, Routes, Route } from "react-router";

import { useCallback, useEffect, useState } from 'react';
import { Lobby } from './Components/Lobby';
import { About } from "./Components/About";
import { AuthContext, AuthType, FocusContext, HotkeysContext, LoadingContext } from "./lib/contexts";
import { GlobalBlankWhiteCardsClient, MultiplayerBlankWhiteCardsClient, lobbyClient, parsePathCode, setClients, startingDeck } from "./lib/clients";
import { Rotate } from "./Components/Icons";
import { useHotkeys, useWindowDimensions } from "./lib/hooks";
import { Gallery } from "./Components/Gallery";

// Landing Page
const App = () => {
  // Loading Status
  const [loading, setLoading] = useState(false);

  // Authentication
  const [auth, setAuthState] = useState({
    matchID: parsePathCode() || localStorage.getItem("matchID") || undefined,
    playerID: localStorage.getItem("playerID") || undefined,
    credentials: localStorage.getItem("credentials") || undefined,
    playerName: localStorage.getItem("playerName") || undefined,
  })
  const setAuth = useCallback(({ matchID, playerID, credentials, playerName }: AuthType) => {
    if (matchID) { localStorage.setItem("matchID", matchID) } else { localStorage.removeItem("matchID") };
    if (playerID) { localStorage.setItem("playerID", playerID) } else { localStorage.removeItem("playerID") };
    if (credentials) { localStorage.setItem("credentials", credentials) } else { localStorage.removeItem("credentials") };
    if (playerName) { localStorage.setItem("playerName", playerName) }; // Player Name persists indefinitely
    setAuthState({ matchID, playerID, credentials, playerName: playerName || localStorage.getItem("playerName") || undefined });
  }, [])

  // Check Credential Validity
  const [validMatch, setValidMatch] = useState(false);
  useEffect(() => {
    if (auth.matchID) {
      setClients(auth.matchID);
      try {
        lobbyClient.getMatch('blank-white-cards', auth.matchID).then(async () => {
          if (auth.matchID && auth.playerID && auth.credentials) {
            await lobbyClient.updatePlayer(
              'blank-white-cards',
              auth.matchID,
              {
                playerID: auth.playerID,
                credentials: auth.credentials,
                newName: auth.playerName,
              }
            );
            setValidMatch(true);
          }
        })
      } catch {
        setValidMatch(false);
        setAuth({});
      }
    }
  }, [auth, setAuth])

  // Focused Card
  const [focus, setFocus] = useState({});

  // Hotkeys
  const [hotkeys, setHotkeys] = useState({});
  useHotkeys({ hotkeys, setHotkeys });

  // Check Screen Size
  const dimensions = useWindowDimensions();

  // Check for In-App Browsers
  if (navigator.userAgent.match(/FBAN|FBAV|Instagram/i)) {
    console.log('In-app browser detected');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', textAlign: 'center', height: '50vh', width: '80vw', fontSize: '1.5em' }}>
        please open this page in your default browser for the best gameplay experience
      </div>
    )
  }

  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      <AuthContext.Provider value={{ auth, setAuth }}>
        <FocusContext.Provider value={{ focus, setFocus }}>
          <HotkeysContext.Provider value={{ hotkeys, setHotkeys }}>
            {(dimensions.height > 500) ?
              <div style={{backgroundColor: (dimensions.upright) ? 'white' : '#eee'}}>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<>
                      <Lobby globalSize={startingDeck.cards.length || 0} />
                      <GlobalBlankWhiteCardsClient />
                    </>} />
                    <Route path="/about" element={<About />} />
                    <Route path="/app" element={<GlobalBlankWhiteCardsClient playerID='0' />} />
                    <Route path="/card" element={<Gallery />}>
                      <Route path=":cardID" element={<Gallery />} />
                    </Route>
                    <Route path="/*" element={<>
                      {(validMatch) ?
                        <MultiplayerBlankWhiteCardsClient playerID={auth.playerID} matchID={auth.matchID} credentials={auth.credentials} /> :
                        <>
                          <Lobby globalSize={startingDeck.cards.length || 0} />
                          <GlobalBlankWhiteCardsClient />
                        </>}
                    </>}></Route>
                  </Routes>
                </BrowserRouter>
              </div> :
              <Rotate />
            }
          </HotkeysContext.Provider>
        </FocusContext.Provider>
      </AuthContext.Provider>
    </LoadingContext.Provider>
  )
};

export default App;