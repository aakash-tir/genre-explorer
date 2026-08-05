import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // The dataset is the payload that matters; warn early if the JS bundle starts
    // competing with it.
    chunkSizeWarningLimit: 600,
  },
});
