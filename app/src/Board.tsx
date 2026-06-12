import type { BoardProps } from '@mcteamster/white-engine/react';
import type { GameState } from '@mcteamster/white-core'
import type { Properties } from 'csstype';
import { ActionSpace } from './Components/ActionSpace.tsx';
import { CommonSpace } from './Components/CommonSpace.tsx';
import { PlayerSpace } from './Components/PlayerSpace.tsx';
import { Console } from './Components/Console.tsx';
import { useWindowDimensions } from './lib/hooks.ts';
import { discordSdk } from './lib/discord.ts';

// Web Components from https://wiredjs.com/
import 'wired-elements';
import { useReducer, useState } from 'react';
import { ImageCacheContext, ImageCacheType } from './lib/contexts.ts';
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
  const dimensions = useWindowDimensions();

  const boardStyle: Properties<string | number> = {
    minHeight: 'calc(90vh - 70px)',
    width: '97vw',
    display: 'grid',
    gridTemplateColumns: 'auto auto auto auto auto auto auto auto auto',
    gridTemplateRows: `${ (discordSdk && dimensions.upright) ? '6em' : '5vh'} auto auto auto auto auto auto auto 7em`,
  };

  // Image Cache
  const [imageCache, dispatchImage] = useReducer((cache: ImageCacheType, image: { id: number, value: string }) => {
    cache[image.id] = image.value;
    return cache
  }, {})

  // Mutual exclusion on mobile: chat and players tray can't both be open
  const [showPlayers, setShowPlayers] = useState(!dimensions.upright);
  const [chatOpen, setChatOpen] = useState(false);

  const isMobile = dimensions.width < 600;

  const handleSetShowPlayers: React.Dispatch<React.SetStateAction<boolean>> = (value) => {
    const next = typeof value === 'function' ? value(showPlayers) : value;
    if (next && isMobile) setChatOpen(false);
    setShowPlayers(next);
  };

  const handleSetChatOpen: React.Dispatch<React.SetStateAction<boolean>> = (value) => {
    const next = typeof value === 'function' ? value(chatOpen) : value;
    if (next && isMobile) setShowPlayers(false);
    setChatOpen(next);
  };

  return (
    <ImageCacheContext.Provider value={{ imageCache, dispatchImage }}>
      <div style={boardStyle}>
        <ActionSpace {...props} />
        <CommonSpace {...props} showPlayers={showPlayers} setShowPlayers={handleSetShowPlayers} />
        <PlayerSpace {...props} />
      </div>
      {props.isMultiplayer && <Console {...props} playerName={props.matchData?.find(p => p.id === Number(props.playerID))?.name} open={chatOpen} setOpen={handleSetChatOpen} />}
    </ImageCacheContext.Provider>
  );
}