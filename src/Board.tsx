import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from './Game.ts'
import type { Properties } from 'csstype';
import { CommonSpace } from './Components/CommonSpace.tsx';

// Web Components from https://wiredjs.com/
import 'wired-elements';
import { PlayerSpace } from './Components/PlayerSpace.tsx';
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'wired-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number }, HTMLElement>;
      'wired-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number }, HTMLElement>;
      'wired-image': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number, src?: string }, HTMLElement>;
    }
  }
}

// Board
export function BlankWhiteCardsBoard(props: BoardProps<GameState>) {
  const boardStyle: Properties<string | number> = {
    minHeight: '90vh',
    width: '97vw',
    display: 'grid',
    gridTemplateColumns: 'auto auto auto auto auto auto auto auto auto',
    gridTemplateRows: '3vh 15vh 15vh 15vh 15vh 3vh auto 10vh auto',
  };

  return (
    <div id="board" style={boardStyle}>
      <CommonSpace {...props} />
      <PlayerSpace {...props} />
    </div>
  );
}