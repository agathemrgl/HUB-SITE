import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Web-app : hors connexion et installation sur l'écran d'accueil (seulement sur le site publié)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/armoire/sw.js', { scope: '/armoire/' }));
}
