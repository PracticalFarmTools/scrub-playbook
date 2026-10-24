import { defineConfig } from 'vitest/config';
import { buildDefines } from './build-info.js';

export default defineConfig({
  define: buildDefines,
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
