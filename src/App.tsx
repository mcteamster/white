// Blank White Cards React App
import { Game } from 'boardgame.io';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { BlankWhiteCards, GameState } from './Game';
import { BlankWhiteCardsBoard } from './Board';
import { useEffect, useState } from 'react';
import { Lobby, lobbyClient, parsePathCode } from './Components/Lobby';

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

// Landing Page
const App = () => {
  // TODO turn this into a provider context
  const [lobbyOpen, setLobbyOpen] = useState(true);
  const [playerID, setPlayerIDState] = useState(localStorage.getItem("playerID") || undefined);
  const [matchID, setMatchIDState] = useState(parsePathCode() || localStorage.getItem("matchID") || undefined);
  const [credentials, setCredentialsState] = useState(localStorage.getItem("credentials") || undefined);

  const setPlayerID = (id: any) => {
    id ? localStorage.setItem("playerID", id) : localStorage.removeItem("playerID");
    setPlayerIDState(id)
  }
  const setMatchID = (id: any) => {
    id ? localStorage.setItem("matchID", id) : localStorage.removeItem("matchID");
    setMatchIDState(id)
  }
  const setCredentials = (creds: any) => {
    creds ? localStorage.setItem("credentials", creds) : localStorage.removeItem("credentials");
    setCredentialsState(creds)
  }

  useEffect(() => {
    if (matchID) {
      try {
        lobbyClient.getMatch('blank-white-cards', matchID).then(() => {
          setLobbyOpen(false);
        });
      } catch (e) {
        console.log(e)
        setLobbyOpen(true);
      }
    }
  }, [playerID, matchID, credentials])

  const lobbyProps = {
    lobbyOpen, 
    setLobbyOpen, 
    playerID, 
    setPlayerID, 
    matchID, 
    setMatchID, 
    credentials, 
    setCredentials, 
    globalSize: startingDeck.cards.length
  }

  return (
    <div id="gameContainer">
      {<Lobby {...lobbyProps}></Lobby>}
      {(playerID && matchID && credentials) ? <MultiplayerBlankWhiteCardsClient playerID={playerID} matchID={matchID} credentials={credentials} /> : <GlobalBlankWhiteCardsClient playerID='0'/>}
    </div>
  )
};

export default App;