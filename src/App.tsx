// Blank White Cards React App
import { Game } from 'boardgame.io';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { BlankWhiteCards, GameState } from './Game';
import { BlankWhiteCardsBoard } from './Board';
import { useState } from 'react';
import { Lobby } from './Components/Lobby';

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
  const [lobbyOpen, setLobbyOpen] = useState(true);
  const [playerID, setPlayerID] = useState();
  const [matchID, setMatchID] = useState();
  const [credentials, setCredentials] = useState();

  return (
    <div id="gameContainer">
      <Lobby {...{lobbyOpen, setLobbyOpen, playerID, setPlayerID, matchID, setMatchID, credentials, setCredentials, globalSize: startingDeck.cards.length}}></Lobby>
      {credentials ? <MultiplayerBlankWhiteCardsClient playerID={playerID} matchID={matchID} credentials={credentials} /> : <GlobalBlankWhiteCardsClient playerID='0'/>}
    </div>
  )
};

export default App;