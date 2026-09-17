import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // These tests write directly to the real user data directory. They remain
    // in Ubuntu CI until their fixtures are made self-contained.
    exclude: [
      'src/__tests__/apiClient.token.test.ts',
      'src/commands/__tests__/plannerModelLoop.test.ts',
      'src/commands/__tests__/settings-commands.test.ts',
      'src/utils/__tests__/env.test.ts',
    ],
  },
});
