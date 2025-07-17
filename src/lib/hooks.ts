// Hooks
import { useState, useEffect, useRef } from 'react';
import { HotkeysContextType } from './contexts';

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
    }

    const keyDownHandler = (event: globalThis.KeyboardEvent) => {
      if (hotkeyMapping[event.code as keyof typeof hotkeyMapping]) {
        const hotkeyEvent: { [key: string]: boolean } = {};
        // Slow Down repeated keys
        if (keyTicks.current > 6 || keyTicks.current == 0) {
          hotkeyEvent[hotkeyMapping[event.code as keyof typeof hotkeyMapping]] = true;
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
export const externalLink = (url: string) => {
  window.open(url, '_blank')
}