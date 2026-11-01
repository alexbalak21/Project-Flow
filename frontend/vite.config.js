import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// /api is proxied to the Express server, so the refresh cookie stays same-origin in dev.
export default defineConfig({
  plugins: [vue()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
