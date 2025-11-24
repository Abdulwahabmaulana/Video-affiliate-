import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" error.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Mendefinisikan process.env secara manual untuk kompatibilitas
      'process.env': {
        API_KEY: env.API_KEY || env.VITE_API_KEY
      }
    }
  };
});