import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The app is served from the root of the Worker's domain. In development, Vite proxies the API
// to `wrangler dev` (run `npm run dev` in worker/ first), so the app always talks to the real API.
export default defineConfig({
    plugins: [react()],
    server: { proxy: { '/v1': 'http://localhost:8787' } },
});
