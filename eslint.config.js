// ESLint: recommended rules. Site code runs in the browser; config and hook scripts run in Node.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'node_modules/', 'supabase/functions/', '.vercel/', '.playwright-mcp/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.config.js', '.claude/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      // Leading underscore marks an argument that is intentionally unused, e.g. (_t, dt) in ticker callbacks
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
];
