// Hooks
import { useMemo, useState, useEffect, useRef } from 'react';
import { HotkeysContextType } from './contexts';
import { discordSdk } from './discord';

// Plugin Player Data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePlayerData(plugins: any) {
  const data = plugins?.player?.data;
  return useMemo(() => ({
    hostPlayerID: (data?.hostPlayerID ?? '0') as string,
    kickedPlayers: (data?.kickedPlayers ?? []) as string[],
  }), [data?.hostPlayerID, data?.kickedPlayers]);
}

// Dimensions
const getWindowDimensions = () => {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
    upright: ((width/height) < 1),
  };
}

export const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
}

// Hotkeys
export const useHotkeys = ({ hotkeys, setHotkeys}: HotkeysContextType) => {
  const keyTicks = useRef(0);
  useEffect(() => {
    const hotkeyMapping = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      Backspace: 'backspace',
      Delete: 'delete',
      Enter: 'enter',
      Escape: 'escape',
      Space: 'space',
      Tab: 'tab',
      KeyQ: 'q',
      KeyW: 'w',
      KeyA: 'a',
      KeyS: 's',
      KeyD: 'd',
      KeyF: 'f',
      KeyR: 'r',
      KeyX: 'x',
      KeyC: 'c',
      KeyP: 'p',
      Backquote: 'backtick',
      Equal: 'equals',
      Digit1: 'n1',
      Digit2: 'n2',
      Digit3: 'n3',
      Digit4: 'n4',
      Digit5: 'n5',
      Digit6: 'n6',
      Digit7: 'n7',
      Digit8: 'n8',
      Digit9: 'n9',
      Digit0: 'n0',
    }

    const keyDownHandler = (event: globalThis.KeyboardEvent) => {
      const tag = document.activeElement?.tagName?.toUpperCase();
      const isInputFocused = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'WIRED-INPUT' || tag === 'WIRED-TEXTAREA';
      const guardExempt = ['Enter', 'Escape', 'Backquote'];
      if (isInputFocused && !guardExempt.includes(event.code)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (hotkeyMapping[event.code as keyof typeof hotkeyMapping]) {
        event.preventDefault();
        const hotkeyEvent: { [key: string]: boolean } = {};
        // Slow Down repeated keys
        if (keyTicks.current > 6 || keyTicks.current == 0) {
          hotkeyEvent[hotkeyMapping[event.code as keyof typeof hotkeyMapping]] = true;
          // Track Shift+Tab for reverse zone cycling
          if (event.code === 'Tab' && event.shiftKey) {
            hotkeyEvent['shiftTab'] = true;
          }
          setHotkeys(hotkeyEvent);
          keyTicks.current = 0;
        }
        keyTicks.current++;
      }
      setTimeout(() => {
        setHotkeys({});
      }, 0)
    };

    // Clear Reference
    const keyUpHandler = () => {
      keyTicks.current = 0;
      setHotkeys({});
    }

    document.addEventListener("keydown", keyDownHandler);
    document.addEventListener("keyup", keyUpHandler);
    return () => {
      document.removeEventListener("keydown", keyDownHandler);
      document.removeEventListener("keyup", keyUpHandler);
    };
  }, [hotkeys, setHotkeys])
}

// Links
export const externalLink = async (url: string) => {
  if (discordSdk) {
    await discordSdk.commands.openExternalLink({
      url: url,
    });
  } else {
    window.open(url, '_blank')
  }
}