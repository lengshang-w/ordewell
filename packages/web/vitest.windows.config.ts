import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/**/*.test.ts'],
    exclude: [
      'server/adapters/__tests__/PoolFileSystem.test.ts',
      'server/adapters/__tests__/run.test.ts',
    ],
  },
});
