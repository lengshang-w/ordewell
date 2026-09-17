# Windows test baseline (temporary)

## Purpose

This document defines the short-term local test boundary for development on
Windows. It exists because the complete upstream suite currently assumes a
POSIX host in several tests, while the authoritative GitHub Actions workflow
runs the full suite on Ubuntu.

Local Windows success is a development gate, not a replacement for the Ubuntu
CI gate.

## Local Windows gate

The Windows gate must cover the code paths changed by this fork:

- runner argument construction and mode selection;
- Windows executable, `.cmd`, and PowerShell launch resolution;
- VS Code terminal creation, task exit, cancellation, completion markers, and
  terminal retention;
- task-runner UI state and output routing;
- platform-independent planner, orchestration, and approval logic.

The eventual command is `npm.cmd run test:windows`, followed by:

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run package
```

## Temporarily outside the Windows gate

The following host-dependent cases remain in the Ubuntu full-suite gate until
they are ported or isolated:

- POSIX paths and executable fixtures (`/tmp`, `/usr/bin`, executable bits);
- Bash-only command parsing and quoting expectations;
- POSIX PTY, `script`, and `SIGTERM` behaviour;
- commands that read POSIX system files such as `/etc/hostname`;
- POSIX-specific `ENOTDIR` spawn behaviour.

Tests that write directly to the real user data directory are also excluded
from the local gate until their fixtures use a temporary data directory. This
is required to keep the test command safe and reproducible under Codex's
Windows sandbox.

## Rules for selecting tests

1. Keep platform-independent tests in the Windows gate by default.
2. Do not exclude an entire runner or terminal test file when it contains
   Windows-relevant cases.
3. In mixed files, skip only explicitly POSIX-host-dependent cases on Windows,
   with a `TODO(windows-tests)` comment explaining the dependency.
4. New runner or terminal-output work must include a test that runs in the
   Windows gate.
5. Before merging, push the feature branch to a pull request targeting `main`;
   GitHub Actions then remains the full Ubuntu regression gate.

## Current observed Windows boundary

### Retain locally

- Core runner argument and mode tests.
- Windows launch tests in `packages/core/src/utils/__tests__/launch.test.ts`.
- Windows launch and PATH-key tests in
  `packages/core/src/services/__tests__/HeadlessRunner.test.ts`.
- VS Code task-runner and terminal tests, except the current host-dependent
  terminal-close assertion.
- CLI terminal rendering, reducer, and terminal-launcher tests that do not
  access the real user data directory.
- Web runner pool, task-runner, route, and UI-independent tests.

### Exclude or mark as POSIX-host-dependent for now

- `commandPolicy` Bash quoting cases.
- POSIX executable-resolution fixtures in `launch`, `spawnPreflight`,
  `RunnerInstallation`, and `CliAgentAiService` tests.
- POSIX path assertions in `RunnerRegistry`, `pluginNames`,
  `pathScope`, and `sessionApprovals` tests.
- Web `PoolFileSystem` test that executes `cat /etc/hostname`.
- Web `run` tests that require POSIX `ENOTDIR` behaviour.
- CLI environment-file tests that depend on the real user data directory and
  host temporary-directory replacement.

## Known issue to decide separately

`VsCodeTerminalRunner` currently has one failing terminal-close test on
Windows. It is in scope for the local gate, so it must be fixed or made
platform-aware rather than hidden by excluding the whole file.
