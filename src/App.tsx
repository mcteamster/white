// Blank White Cards React App
import { Game } from 'boardgame.io';
import { Client, Lobby } from 'boardgame.io/react';
import { BlankWhiteCards, GameState } from './Game';
import { BlankWhiteCardsBoard } from './Board';
import { useState } from 'react';

// Seeding Data
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

// Singleplayer
const BlankWhiteCardsClient = Client({
  game: SetupGame,
  board: BlankWhiteCardsBoard,
  debug: import.meta.env.MODE === 'development',
});

// Server Hosted Multiplayer
const LobbyClient = () => (
  <Lobby
    gameServer={`http://localhost:8000`}
    lobbyServer={`http://localhost:8000`}
    gameComponents={[
      { game: SetupGame, board: BlankWhiteCardsBoard }
    ]}
  />
)

// Landing Page
const App = () => {
  const [variant, _setVariant] = useState('singleplayer');
  
  return (
    <div id="gameContainer">
      {variant === 'singleplayer' && <BlankWhiteCardsClient playerID='0' />}
      {variant === 'multiplayer' && <LobbyClient></LobbyClient>}
    </div>
  )
};

export default App;