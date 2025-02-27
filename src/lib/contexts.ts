// Contexts
import { createContext, Dispatch, SetStateAction } from 'react';

// Auth
export interface AuthType {
  matchID?: string,
  playerID?: string,
  credentials?: string,
  playerName?: string,
}

export interface AuthContextType {
  auth?: AuthType,
  setAuth: (auth: AuthType) => void;
}

export const AuthContext = createContext<AuthContextType>({ setAuth: () => {} });

// Focus
export interface FocusType {
  id?: number,
}

export interface FocusContextType {
  focus: FocusType,
  setFocus: (focus: FocusType) => void;
}

export const FocusContext = createContext<FocusContextType>({ focus: {}, setFocus: () => {} });

// Hotkeys
export interface HotkeysType {
  up?: boolean | undefined,
  down?: boolean | undefined,
  left?: boolean | undefined,
  right?: boolean | undefined,
  backspace?: boolean | undefined,
  delete?: boolean | undefined,
  enter?: boolean | undefined,
  escape?: boolean | undefined,
  space?: boolean | undefined,
}

export interface HotkeysContextType {
  hotkeys: HotkeysType,
  setHotkeys: Dispatch<SetStateAction<HotkeysType>>;
}

export const HotkeysContext = createContext<HotkeysContextType>({ hotkeys: {}, setHotkeys: () => { return {} } });