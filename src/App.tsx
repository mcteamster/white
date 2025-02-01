// Blank White Cards React App
import { BlankWhiteCards } from './Game';
import { BlankWhiteCardsBoard } from './Board';

// Seeding Data
const deck = await (await fetch('/decks/global.json')).json();
const PrefilledWhiteCards: Game = { ...BlankWhiteCards, setup: () => (deck) }

// Local Development with Debugger
import { Client } from 'boardgame.io/react';
import { Game } from 'boardgame.io';
const BlankWhiteCardsClient = Client({
  game: PrefilledWhiteCards,
  board: BlankWhiteCardsBoard,
  debug: false,
});
const App = () => (
  <BlankWhiteCardsClient playerID='0' />
);

// import { Lobby } from 'boardgame.io/react';
// const App = () => {
//   return (
//     <div>
//       <Lobby
//         gameServer={`http://localhost:8000`}
//         lobbyServer={`http://localhost:8000`}
//         gameComponents={[
//           { game: PrefilledWhiteCards, board: BlankWhiteCardsBoard }
//         ]}
//       />
//     </div>
//   )
// };

export default App;