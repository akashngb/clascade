import { defineConfig } from 'vite';

// Vanilla Three.js app (no framework) — kept simple for template control.
// On build we use a relative base ("./") so the bundle can be served from a
// subpath (the console embeds it at /renderer/sarajevo/); dev stays at "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  server: { port: 5173, open: true },
  build: { target: 'es2020', outDir: 'dist' },
}));
