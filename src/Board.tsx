// Board.tsx
import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from './Game.ts'
import type { Properties } from 'csstype';
import { getCardsByLocation } from './Cards';

export function BlankWhiteCardsBoard({ G, moves }: BoardProps<GameState>) {
  const pickupCard = () => moves.pickupCard();

  const cellStyle: Properties<string | number> = {
    border: '1px solid #555',
    width: '50px',
    height: '50px',
    lineHeight: '50px',
    textAlign: 'center',
  };

  return (
    <div>
      <div>Pile: {JSON.stringify(getCardsByLocation(G.cards, "pile"))}</div>
      <div>Deck: {JSON.stringify(getCardsByLocation(G.cards, "deck"))}</div>
      <div>Hand: {JSON.stringify(getCardsByLocation(G.cards, "hand"))}</div>
      <div>Table: {JSON.stringify(getCardsByLocation(G.cards, "table"))}</div>
      <div>Discard: {JSON.stringify(getCardsByLocation(G.cards, "discard"))}</div>
      <button style={cellStyle} onClick={() => pickupCard()}>Pickup</button>
    </div>
  );
}