import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from '../Game.ts'
import type { Properties } from 'csstype';
import { CardFace } from './CardFace.tsx';
import { getCardsByLocation } from '../Cards';

export function Deck(props: BoardProps<GameState>) {
  let deck = getCardsByLocation(props.G.cards, "deck");

  const styles: { [key: string]: Properties<string | number> } = {
    deck: {
      width: '100%',
      height: '100%',
      gridRow: '8',
      gridColumn: '5',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      height: '50px',
      width: '100px',
      fontWeight: 'bold',
      textAlign: 'center',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
  };

  return (
    <div style={styles.deck} >
      {/* <wired-card style={styles.button} onClick={() => props.moves.createCard()} elevation={2}>Create Card</wired-card> */}
      <wired-card style={styles.button} onClick={() => props.moves.pickupCard()} elevation={deck.length > 4 ? 4 : deck.length}>Pickup Card</wired-card>
    </div>
  );
}

export function Pile(props: BoardProps<GameState>) {
  let pile = getCardsByLocation(props.G.cards, "pile").sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Newest to Oldest

  const styles: { [key: string]: Properties<string | number> } = {
    pile: {
      width: '100%',
      height: '100%',
      gridRow: '2 / 6',
      gridColumn: '1 / 10',
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
            "author": "mcteamster",
            "description": "Pick up cards. Do what they say. Add your own!",
          },
          "location": "pile",
        }} />}
      </div>
    </div>
  );
}

export function CommonSpace(props: BoardProps<GameState>) {

  return (
    <>
      <Pile {...props} />
      <Deck {...props} />
    </>
  );
}