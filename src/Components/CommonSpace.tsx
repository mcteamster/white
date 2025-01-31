import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import type { Properties } from 'csstype';
import { CardFace } from './CardFace.tsx';
import { getCardsByLocation } from '../Cards';
import { Icon } from './Icons';

export function Pile(props: BoardProps<GameState>) {
  const pile = getCardsByLocation(props.G.cards, "pile").sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Newest to Oldest

  const styles: { [key: string]: Properties<string | number> } = {
    pile: {
      width: '100%',
      height: '100%',
      gridRow: '2 / 7',
      gridColumn: '5',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
  };

  return (
    <div style={styles.pile}>
      <div onClick={() => props.moves.focusCard(pile[0].id, true)}>
        {pile.length > 0 ?
        <CardFace {...pile[0]} /> :
        <CardFace {...{
          "id": 0,
          "content": {
            "title": "Blank White Cards",
            "author": "a game by mcteamster",
            "description": "Pick up cards. Do what they say. Create your own!",
          },
          "location": "pile",
          "focused": [],
        }} />}
      </div>
    </div>
  );
}

export function Header(props: BoardProps<GameState>) {
  const deck = getCardsByLocation(props.G.cards, "deck");

  const styles: { [key: string]: Properties<string | number> } = {
    header: {
      width: '100%',
      height: '2em',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '10',
      backgroundColor: 'white',
      borderBottom: '0.5pt solid black',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    item: {
      display: 'flex',
      flexDirection: 'row',
      padding: '0 0.5em',
    }
  };

  return (
    <div style={styles.header}>
      <div style={styles.item}><Icon name='menu'></Icon>&nbsp;Blank White Cards</div>
      <div style={styles.item}>{`${deck.length}/${props.G.cards.length}`}</div>
    </div>
  )
}

export function CommonSpace(props: BoardProps<GameState>) {

  return (
    <>
      <Header {...props} />
      <Pile {...props} />
    </>
  );
}