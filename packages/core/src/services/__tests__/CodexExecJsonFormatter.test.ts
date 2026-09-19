import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { CodexExecJsonFormatter } from '../CodexExecJsonFormatter';

const fixtureDir = join(__dirname, 'fixtures', 'runner-output', 'codex-exec');

describe('CodexExecJsonFormatter', () => {
  it('renders the recorded Codex exec JSONL fixture as compact terminal activity', () => {
    const stdout = readFileSync(join(fixtureDir, 'stdout.jsonl'), 'utf8');
    const stderr = readFileSync(join(fixtureDir, 'stderr.log'), 'utf8');
    const expected = readFileSync(join(fixtureDir, 'compact.expected.log'), 'utf8');
    const formatter = new CodexExecJsonFormatter({ mode: 'compact' });

    const actual = formatter.formatStdout(stdout) + formatter.formatStderr(stderr) + formatter.flush();

    expect(actual).toBe(expected);
  });

  it('buffers a JSONL record split across stdout chunks', () => {
    const formatter = new CodexExecJsonFormatter({ mode: 'compact' });
    const line = '{"type":"item.completed","item":{"type":"agent_message","text":"Visible message"}}\n';

    expect(formatter.formatStdout(line.slice(0, 20))).toBe('');
    expect(formatter.formatStdout(line.slice(20))).toBe('Visible message\n');
  });

  it('leaves both streams untouched in raw mode', () => {
    const formatter = new CodexExecJsonFormatter({ mode: 'raw' });

    expect(formatter.formatStdout('{not json}\n')).toBe('{not json}\n');
    expect(formatter.formatStderr('native warning\n')).toBe('native warning\n');
    expect(formatter.flush()).toBe('');
  });
});
