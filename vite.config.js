import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// /batches/<slug>/ (e.g. /batches/elite/) is served by the one batch page in batches/view/.
// vercel.json does the same rewrite in production; this plugin does it for `vite` and `vite preview`.
const BATCH_PAGE = /^\/batches\/(?!view\/)[a-z0-9-]+\/?(\?.*)?$/i;
function batchPages() {
  const rewrite = (req, _res, next) => {
    if (BATCH_PAGE.test(req.url)) req.url = `/batches/view/${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;
    next();
  };
  return {
    name: 'hope-batch-pages',
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

// Multi-page build: each folder index.html works on any static server without rewrites.
export default defineConfig({
  plugins: [batchPages()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        batches: resolve(import.meta.dirname, 'batches/index.html'),
        batch: resolve(import.meta.dirname, 'batches/view/index.html'),
        alumni: resolve(import.meta.dirname, 'alumni/index.html'),
        admin: resolve(import.meta.dirname, 'hope-hq/index.html'),
      },
    },
  },
});
