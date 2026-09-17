import { defineConfig } from 'vitest/config';

/**
 * Fast local gate for Windows development.
 *
 * The excluded files use POSIX-only paths, executable fixtures, signals, or
 * filesystem permissions. Ubuntu CI continues to run the complete suite.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: [
      'src/services/__tests__/BaseFileSystem.test.ts',
      'src/services/__tests__/CliAgentAiService.test.ts',
      'src/services/__tests__/commandPolicy.test.ts',
      'src/services/__tests__/pathScope.test.ts',
      'src/services/__tests__/ripgrepArgs.test.ts',
      'src/services/__tests__/sessionApprovals.test.ts',
      'src/services/harness/__tests__/openCodeRecovery.test.ts',
      'src/plugins/__tests__/RunnerRegistry.test.ts',
      'src/utils/__tests__/daemonToken.test.ts',
      'src/utils/__tests__/workspace.test.ts',
    ],
  },
});
