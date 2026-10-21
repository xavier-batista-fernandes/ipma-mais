import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `base: './'` keeps every asset and data URL relative, so the build works both at the root
// of a domain and under GitHub Pages' /ipma-mais/ path.
export default defineConfig({
    base: './',
    plugins: [react()],
});
