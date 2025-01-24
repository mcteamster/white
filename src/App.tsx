// Blank White Cards React App
import { BlankWhiteCards } from './Game';
import { BlankWhiteCardsBoard } from './Board';

// Local Development with Debugger
import { Client } from 'boardgame.io/react';
const BlankWhiteCardsClient = Client({
  game: BlankWhiteCards,
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
//           { game: BlankWhiteCards, board: BlankWhiteCardsBoard }
//         ]}
//       />
//     </div>
//   )
// };

export default App;