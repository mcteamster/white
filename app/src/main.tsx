import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Clarity from '@microsoft/clarity';
import { initaliseDiscord } from './lib/discord';

const isDiscord = initaliseDiscord();

// Initialize Clarity after patches are applied
if (import.meta.env.VITE_CLARITY_ID && import.meta.env.VITE_ORIGIN == 'https://blankwhite.cards') {
  if (isDiscord) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => Clarity.init(import.meta.env.VITE_CLARITY_ID));
    });
  } else {
    Clarity.init(import.meta.env.VITE_CLARITY_ID);
  }
  console.debug('Clarity enabled');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
