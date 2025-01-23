import { Lobby, Client } from 'boardgame.io/react';
import { BlankWhiteCards } from './Game';
import { BlankWhiteCardsBoard } from './Board';

// Local Development with Debugger
const BlankWhiteCardsClient = Client({
  game: BlankWhiteCards,
  board: BlankWhiteCardsBoard,
});
const App = () => (
  <BlankWhiteCardsClient playerID='0' />
);

// const App = () => (
//   <div>
//     <Lobby
//       gameServer={`http://localhost:8000`}
//       lobbyServer={`http://localhost:8000`}
//       gameComponents={[
//         { game: BlankWhiteCards, board: BlankWhiteCardsBoard }
//       ]}
//     />;
//   </div>
// );

export default App;