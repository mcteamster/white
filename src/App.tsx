// Blank White Cards React App
import { BrowserRouter, Routes, Route } from "react-router";
import { Game } from 'boardgame.io';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { BlankWhiteCards, GameState } from './Game';
import { BlankWhiteCardsBoard } from './Board';
import { useEffect, useState, createContext } from 'react';
import { Lobby, lobbyClient } from './Components/Lobby';
import { About } from "./Components/About";

// Global Deck Singleplayer
let SetupGame: Game = BlankWhiteCards;
let startingDeck: GameState;
try {
  startingDeck = await (await fetch('/decks/global.json')).json();
  if (startingDeck.cards && startingDeck.cards.length > 0) {
    SetupGame = { ...BlankWhiteCards, setup: () => (startingDeck) }
  }
} catch (e) {
  console.error(e)
}
const GlobalBlankWhiteCardsClient = Client({
  game: SetupGame,
  board: BlankWhiteCardsBoard,
  debug: false,
});

// Multiplayer Custom Rooms
const serverUrl = import.meta.env.VITE_GAME_SERVER;
const MultiplayerBlankWhiteCardsClient = Client({
  game: BlankWhiteCards,
  board: BlankWhiteCardsBoard,
  debug: false,
  multiplayer: SocketIO({ server: serverUrl }),
});

interface AuthContextType {
  auth?: any,
  setAuth: (auth: any) => void;
}
export const AuthContext = createContext<AuthContextType>({ setAuth: () => {} });

const parsePathCode = () => {
  const pathname = window.location.pathname;
  if (pathname.match(/^\/[A-Za-z]{4}$/)) {
    const room = pathname.slice(1,5).toUpperCase();
    return room
  } else {
    return
  }
}

// Landing Page
const App = () => {
  // Authentication
  const [auth, setAuthState] = useState({
    matchID: parsePathCode() || localStorage.getItem("matchID") || undefined,
    playerID: localStorage.getItem("playerID") || undefined,
    credentials: localStorage.getItem("credentials") || undefined,
    playerName: localStorage.getItem("playerName") || undefined,
  })
  const setAuth = ({ matchID, playerID, credentials, playerName }: any) => {
    matchID ? localStorage.setItem("matchID", matchID) : localStorage.removeItem("matchID");
    playerID ? localStorage.setItem("playerID", playerID) : localStorage.removeItem("playerID");
    credentials ? localStorage.setItem("credentials", credentials) : localStorage.removeItem("credentials");
    playerName && localStorage.setItem("playerName", playerName); // Player Name persists indefinitely
    setAuthState({ matchID, playerID, credentials, playerName: playerName || auth.playerName });
  }

  // Check Credential Validity
  const [validMatch, setValidMatch] = useState(false);
  useEffect(() => {
    if (auth.matchID) {
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
      } catch (e) {
        setValidMatch(false);
        setAuth({});
      }
    }
  }, [auth])

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<>
            <Lobby globalSize={ startingDeck.cards.length || 0 } />
            <GlobalBlankWhiteCardsClient />
          </>} />
          <Route path="/about" element={<About />} />
          <Route path="/app" element={<GlobalBlankWhiteCardsClient playerID='0' />} />
          <Route path="/*" element={<>
            {(validMatch) ?
              <MultiplayerBlankWhiteCardsClient playerID={auth.playerID} matchID={auth.matchID} credentials={auth.credentials} /> :
              <>
                <Lobby globalSize={ startingDeck.cards.length || 0 } />
                <GlobalBlankWhiteCardsClient />
              </>}
          </>}></Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
};

export default App;