import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Backend tests run under Electron's Node (see the "test" script) because
// better-sqlite3 is compiled for Electron's ABI by electron-rebuild.
export default defineConfig({
  test: {
    root: path.resolve(here, '..'),
    include: ['backend/tests/**/*.test.js'],
    environment: 'node',
    globals: true,
    pool: 'forks',
    // Each file gets a fresh module registry and its own temp database.
    isolate: true,
    // Tests never read real AI keys from backend/.env (no paid calls); suites set fake ones.
    env: { GEMINI_API_KEY: '', ANTHROPIC_API_KEY: '', GEMINI_MODEL: '' },
  },
});
