import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from './Game.ts'
import type { Properties } from 'csstype';
import { ActionSpace } from './Components/ActionSpace.tsx';
import { CommonSpace } from './Components/CommonSpace.tsx';
import { PlayerSpace } from './Components/PlayerSpace.tsx';

// Web Components from https://wiredjs.com/
import 'wired-elements';
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'wired-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number }, HTMLElement>;
      'wired-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number }, HTMLElement>;
      'wired-dialog': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number, open?: boolean }, HTMLElement>;
      'wired-image': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number, src?: string }, HTMLElement>;
    }
  }
}

// Board
export function BlankWhiteCardsBoard(props: BoardProps<GameState>) {
  const boardStyle: Properties<string | number> = {
    minHeight: '100vh',
    width: '97vw',
    display: 'grid',
    gridTemplateColumns: 'auto auto auto auto auto auto auto auto auto',
    gridTemplateRows: '5vh auto auto auto auto 1vh auto auto auto',
  };

  return (
    <div id="board" style={boardStyle}>
      <ActionSpace {...props} />
      <CommonSpace {...props} />
      <PlayerSpace {...props} />
    </div>
  );
}