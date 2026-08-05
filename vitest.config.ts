/**
 * Test config lives here rather than under a `test` key in `vite.config.ts` — Vitest 4
 * types that key through its own `defineConfig`, and mixing the two makes `tsc` reject
 * the Vite config.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
