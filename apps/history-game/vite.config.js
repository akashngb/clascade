import { defineConfig } from 'vite';

// Vanilla Three.js app (no framework) — kept simple for template control.
export default defineConfig({
  server: { port: 5173, open: true },
  build: { target: 'es2020' },
});
