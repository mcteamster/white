import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Clarity from '@microsoft/clarity';

// Initialize Clarity only for official deployment
if (import.meta.env.VITE_CLARITY_ID && import.meta.env.VITE_ORIGIN == 'https://white.mcteamster.com') {
  Clarity.init(import.meta.env.VITE_CLARITY_ID);
  console.debug('Clarity enabled');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
