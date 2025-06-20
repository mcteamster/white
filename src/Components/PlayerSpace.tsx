import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import type { Properties } from 'csstype';
import { getCardsByLocation, getCardsByOwner } from '../Cards';
import { CardFace } from './CardFace.tsx';
import { useCallback, useContext } from 'react';
import { FocusContext } from '../lib/contexts.ts';

export function Hand(props: BoardProps<GameState>) {
  const { focus, setFocus } = useContext(FocusContext);
  const focusCard = useCallback(((id: number, focusState: boolean) => {
    if (focus?.id != id && focusState == true) {
      setFocus({ id });
    } else {
      setFocus({});
    }
  }), [focus, setFocus]);

  const styles: { [key: string]: Properties<string | number> } = {
    hand: {
      width: '100%',
      gridRow: '8',
      gridColumn: '2 / 9',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
    },
  };

  const hand = getCardsByLocation(props.playerID ? getCardsByOwner(props.G.cards, props.playerID) : [], "hand").sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // Oldest to Newest
  return (
    <div style={styles.hand}>
      {hand.map((card, i) => {
        return <div key={`${props.playerID}-hand-${i}`} onClick={() => focusCard(card.id, true)}>
          <CardFace {...card} />
        </div>
      })}
    </div>
  );
}

export function Table(props: BoardProps<GameState>) {
  const { focus, setFocus } = useContext(FocusContext);
  const focusCard = useCallback(((id: number, focusState: boolean) => {
    if (focus?.id != id && focusState == true) {
      setFocus({ id });
    } else {
      setFocus({});
    }
  }), [focus, setFocus]);

  const styles: { [key: string]: Properties<string | number> } = {
    table: {
      gridRow: '7',
      gridColumn: '2 / 9',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
    },
    tableCards: {
      minWidth: '5em',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      borderRadius: '1em',
      margin: '0.25em',
      padding: '0.25em',
    }
  };

  const table = getCardsByLocation(props.playerID ? getCardsByOwner(props.G.cards, props.playerID) : [], "table").sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // Oldest to Newest
  return (
    <div style={styles.table}>
      <div style={styles.tableCards}>
        {table.map((card, i) => {
          return <div key={`${props.playerID}-table-${i}`} onClick={() => focusCard(card.id, true)}>
            <CardFace {...card} />
          </div>
        })}
      </div>
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