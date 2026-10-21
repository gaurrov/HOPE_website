import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Multi-page build: each folder index.html works on any static server without rewrites.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        batches: resolve(import.meta.dirname, 'batches/index.html'),
        alumni: resolve(import.meta.dirname, 'alumni/index.html'),
        admin: resolve(import.meta.dirname, 'hope-hq/index.html'),
      },
    },
  },
});
