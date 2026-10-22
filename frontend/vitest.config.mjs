import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Tests run under Electron's Node (see the "test" script) because
// better-sqlite3 is compiled for Electron's ABI by electron-rebuild.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  // same '@' alias as vite.config.js (shadcn-style imports such as @/components/ui)
  resolve: { alias: { '@': path.resolve(here, 'src') } },
  test: {
    root: path.resolve(here, '..'),
    include: ['backend/tests/**/*.test.js', 'frontend/src/**/*.test.{js,jsx,ts,tsx}'],
    environment: 'node',
    // Interface tests render React components in a simulated DOM.
    environmentMatchGlobs: [['frontend/src/**', 'jsdom']],
    globals: true,
    pool: 'forks',
    // Each file gets a fresh module registry and its own temp database.
    isolate: true,
    // Tests never read real AI keys from backend/.env (no paid calls); suites set fake ones.
    env: { GEMINI_API_KEY: '', ANTHROPIC_API_KEY: '', GEMINI_MODEL: '', CLAUDE_MODEL: '' },
  },
});
