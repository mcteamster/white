// Hooks
import { useState, useEffect, useContext } from 'react';
import { FocusContext, HotkeysContextType } from './contexts';

// Dimensions
const getWindowDimensions = () => {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height
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

// Focus
export const useFocus = ((id: number, focusState: boolean) => {
  const { focus, setFocus } = useContext(FocusContext);
  if (focus?.id != id && focusState == true) {
    setFocus({ id });
  } else {
    setFocus({});
  }
});

// Hotkeys
export const useHotkeys = ({ hotkeys, setHotkeys}: HotkeysContextType) => {
  useEffect(() => {
    const hotkeyMapping = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      Backspace: 'backspace',
      Enter: 'enter',
      Escape: 'escape',
      Space: 'space',
    }

    const keyDownHandler = (event: globalThis.KeyboardEvent) => {
      if (hotkeyMapping[event.code as keyof typeof hotkeyMapping]) {
        const hotkeyEvent: { [key: string]: boolean } = {};
        hotkeyEvent[hotkeyMapping[event.code as keyof typeof hotkeyMapping]] = true;
        // setHotkeys(hotkeyEvent); // TODO: Debounce Hotkeys for Performance
      }
      setTimeout(() => {
        setHotkeys({});
      }, 0)
    };

    document.addEventListener("keydown", keyDownHandler);
    return () => {
      document.removeEventListener("keydown", keyDownHandler);
    };
  }, [hotkeys, setHotkeys])
}