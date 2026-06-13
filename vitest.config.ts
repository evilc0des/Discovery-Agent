import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/.next/**', '**/node_modules/**'],
  },
  resolve: {
    tsconfigPaths: true,
  },
});
