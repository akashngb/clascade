import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Student client is a single-page R3F app. Kept intentionally minimal so it
// can later be folded into the Next.js /apps/student route from CLAUDE.md.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, open: true },
});
