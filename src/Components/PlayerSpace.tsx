import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import type { Properties } from 'csstype';
import { getCardsByLocation } from '../Cards';
import { CardFace } from './CardFace.tsx';

export function Hand(props: BoardProps<GameState>) {
  const styles: { [key: string]: Properties<string | number> } = {
    hand: {
      width: '100%',
      gridRow: '9',
      gridColumn: '1 / 10',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
    },
  };

  let hand = getCardsByLocation(props.G.cards, "hand").sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Oldest to Newest
  if (hand.length == 0) {
    return (
      <div style={styles.hand}>
        <CardFace {...{
          "id": 0,
          "content": {
            "title": "(Empty Hand)",
          },
          "location": "hand",
        }} />
      </div>
    )
  }
  return (
    <div style={styles.hand}>
      {hand.map(card => {
        return <div onClick={() => props.moves.moveCard(card.id, "pile")}>
          <CardFace {...card} />
        </div>
      })}
    </div>
  );
}

export function Table(props: BoardProps<GameState>) {
  const styles: { [key: string]: Properties<string | number> } = {
    table: {
      width: '100%',
      gridRow: '7',
      gridColumn: '1 / 10',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap-reverse',
      justifyContent: 'center',
      alignItems: 'center',
    },
  };

  let table = getCardsByLocation(props.G.cards, "table");
  return (
    <div style={styles.table}>
      {table.map(card => {
        return <div onClick={() => props.moves.moveCard(card.id, "pile")}>
          <CardFace {...card} />
        </div>
      })}
    </div>
  );
}

export function PlayerSpace(props: BoardProps<GameState>) {
  return (
    <>
      <Table {...props} />
      <Hand {...props} />
    </>
  );
}