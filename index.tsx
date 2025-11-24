import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- POLYFILL UNTUK VERCEL/BROWSER ---
// Mencegah crash "ReferenceError: process is not defined" di browser.
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

// Fallback: Jika process.env.API_KEY kosong, coba ambil dari VITE_API_KEY (standar Vite/Vercel)
// Ini memungkinkan aplikasi berjalan di Vercel jika Anda menyetel Environment Variable bernama "VITE_API_KEY"
if (typeof process !== 'undefined' && process.env) {
  try {
    // @ts-ignore - Mengabaikan error typescript untuk import.meta yang mungkin tidak dikenali di beberapa config
    if (!process.env.API_KEY && typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
       // @ts-ignore
       process.env.API_KEY = import.meta.env.VITE_API_KEY;
    }
  } catch (e) {
    // Abaikan error jika import.meta tidak tersedia
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);