import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/.next/**', '**/node_modules/**'],
    env: {
      STORAGE_BACKEND: 'file',
    },
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    tsconfigPaths: true,
  },
});
