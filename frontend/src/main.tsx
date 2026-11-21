import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
} else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Evita que un SW de desarrollo sirva CSS/TSX viejo en cache durante `vite dev`
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      void registration.unregister();
    }
  });
  if ('caches' in window) {
    void caches.keys().then((keys) => {
      for (const key of keys) {
        if (key.includes('yaanal-kaan') || key.includes('workbox')) {
          void caches.delete(key);
        }
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
