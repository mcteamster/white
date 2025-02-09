// Contexts
import { createContext } from 'react';

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