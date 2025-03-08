import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from './Game.ts'
import type { Properties } from 'csstype';
import { ActionSpace } from './Components/ActionSpace.tsx';
import { CommonSpace } from './Components/CommonSpace.tsx';
import { PlayerSpace } from './Components/PlayerSpace.tsx';

// Web Components from https://wiredjs.com/
import 'wired-elements';
import { useEffect, useReducer } from 'react';
import { ImageCacheContext, ImageCacheType } from './lib/contexts.ts';
import { Card } from './Cards.ts';
import { decompressImage } from './lib/images.ts';
declare global {
  namespace React.JSX {
    interface IntrinsicElements {
      'wired-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number }, HTMLElement>;
      'wired-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number }, HTMLElement>;
      'wired-dialog': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number, open?: boolean }, HTMLElement>;
      'wired-image': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number, src?: string }, HTMLElement>;
      'wired-input': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number, placeholder?: string, minlength?: number, maxlength?: number, value?: string }, HTMLElement>;
      'wired-radio': React.DetailedHTMLProps<React.HTMLAttributes<HTMLInputElement> & { elevation?: number, value?: string, name?: string }, HTMLInputElement>;
      'wired-textarea': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { elevation?: number }, HTMLElement>;
    }
  }
}

// Board
export function BlankWhiteCardsBoard(props: BoardProps<GameState>) {
  const boardStyle: Properties<string | number> = {
    minHeight: 'calc(90vh - 70px)',
    width: '97vw',
    display: 'grid',
    gridTemplateColumns: 'auto auto auto auto auto auto auto auto auto',
    gridTemplateRows: '5vh auto auto auto auto auto auto auto 7em',
  };

  // Image Cache
  const [imageCache, dispatchImage] = useReducer((cache: ImageCacheType, image: { id: number, value: string }) => {
    cache[image.id] = image.value;
    return cache
  }, {})

  // Cache All Images from Gamestate
  useEffect(() => {
    props.G.cards.forEach((card: Card) => {
      if (card.id) {
        if (card.content.image?.startsWith('data:image/png;base64,')) { // Support PNG Data URIs
          dispatchImage({ id: card.id, value: card.content.image})
        } else if (card.content.image) { // RLE UTF-8 String
          decompressImage(card.content.image).then(res => {
            dispatchImage({ id: card.id, value: res});
          });
        }
      }
    })
  // Cache population step only needs to run once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ImageCacheContext.Provider value={{ imageCache, dispatchImage }}>
      <div style={boardStyle}>
        <ActionSpace {...props} />
        <CommonSpace {...props} />
        <PlayerSpace {...props} />
      </div>
    </ImageCacheContext.Provider>
  );
}