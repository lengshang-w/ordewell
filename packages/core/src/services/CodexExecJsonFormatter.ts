export type RunnerOutputMode = 'compact' | 'raw';

export interface CodexExecJsonFormatterOptions {
  mode: RunnerOutputMode;
}

interface CodexItem {
  id?: string;
  type?: string;
  text?: string;
  message?: string;
  command?: string;
  aggregated_output?: string;
  exit_code?: number | null;
  status?: string;
}

interface CodexExecEvent {
  type?: string;
  item?: CodexItem;
}

const OUTPUT_HEAD_LINES = 3;
const OUTPUT_TAIL_LINES = 2;
const STDERR_LINE_LIMIT = 240;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function numberOrNull(value: unknown): number | null | undefined {
  return typeof value === 'number' || value === null ? value : undefined;
}

function eventFrom(value: unknown): CodexExecEvent | null {
  const outer = record(value);
  if (!outer) return null;
  const item = record(outer.item);
  return {
    type: string(outer.type),
    item: item ? {
      id: string(item.id),
      type: string(item.type),
      text: string(item.text),
      message: string(item.message),
      command: string(item.command),
      aggregated_output: string(item.aggregated_output),
      exit_code: numberOrNull(item.exit_code),
      status: string(item.status),
    } : undefined,
  };
}

function fileName(path: string): string {
  const normalized = path.replace(/["']/g, '').split(/[\\/]/).filter(Boolean);
  return normalized.at(-1) || 'file';
}

function summarizeCommand(command: string | undefined): string {
  if (!command) return 'command';
  const read = /Get-Content(?:\s+-Raw)?\s+-LiteralPath\s+([^\s'"`]+)/i.exec(command);
  if (read) return `Reading ${fileName(read[1])}`;
  if (/(^|\s)rg(?:\s|$)/.test(command)) return 'Searching files';
  if (/(^|\s)(npm|pnpm|yarn)\s+test(?:\s|$)/.test(command)) return 'Running tests';
  return 'Running command';
}

function compactOutput(output: string): string {
  const lines = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.length <= OUTPUT_HEAD_LINES + OUTPUT_TAIL_LINES) {
    return lines.map((line) => `  ${line}`).join('\n');
  }
  const omitted = lines.length - OUTPUT_HEAD_LINES - OUTPUT_TAIL_LINES;
  return [
    ...lines.slice(0, OUTPUT_HEAD_LINES).map((line) => `  ${line}`),
    `  … ${omitted} lines omitted …`,
    ...lines.slice(-OUTPUT_TAIL_LINES).map((line) => `  ${line}`),
  ].join('\n');
}

function stderrLine(line: string): string {
  if (line.length <= STDERR_LINE_LIMIT) return `stderr | ${line}`;
  const omitted = line.length - STDERR_LINE_LIMIT;
  return `stderr | ${line.slice(0, STDERR_LINE_LIMIT)}… (${omitted} chars omitted)`;
}

/**
 * Renders only the documented JSONL emitted by `codex exec --json`. Raw bytes
 * stay with the terminal session for verdicts and diagnostics; this class owns
 * just the human-facing stream.
 */
export class CodexExecJsonFormatter {
  private stdoutBuffer = '';
  private stderrBuffer = '';

  constructor(private readonly options: CodexExecJsonFormatterOptions) {}

  formatStdout(chunk: string): string {
    if (this.options.mode === 'raw') return chunk;
    this.stdoutBuffer += chunk;
    return this.drainStdout(false);
  }

  formatStderr(chunk: string): string {
    if (this.options.mode === 'raw') return chunk;
    this.stderrBuffer += chunk;
    return this.drainStderr(false);
  }

  flush(): string {
    if (this.options.mode === 'raw') return '';
    return this.drainStdout(true) + this.drainStderr(true);
  }

  private drainStdout(flush: boolean): string {
    const complete = this.stdoutBuffer.split(/\r?\n/);
    this.stdoutBuffer = flush ? '' : complete.pop() ?? '';
    if (flush && complete.at(-1) === '') complete.pop();
    return complete.map((line) => this.formatJsonLine(line)).filter(Boolean).join('');
  }

  private drainStderr(flush: boolean): string {
    const complete = this.stderrBuffer.split(/\r?\n/);
    this.stderrBuffer = flush ? '' : complete.pop() ?? '';
    if (flush && complete.at(-1) === '') complete.pop();
    return complete.filter((line) => line.length > 0).map((line) => `${stderrLine(line)}\n`).join('');
  }

  private formatJsonLine(line: string): string {
    if (!line.trim()) return '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      return `[codex jsonl] ${line}\n`;
    }
    const event = eventFrom(parsed);
    if (!event?.type) return `[codex jsonl] ${line}\n`;
    if (event.type === 'thread.started' || event.type === 'turn.started') return '';
    if (event.type === 'turn.completed') return 'Completed\n';
    if (!event.item) return `[codex event] ${event.type}\n`;

    if (event.item.type === 'agent_message' && event.item.text) return `${event.item.text}\n`;
    if (event.item.type === 'error' && event.item.message) {
      const prefix = /warning/i.test(event.item.message) ? 'Warning: Codex configuration' : 'Codex error';
      const message = event.item.message.split(' To suppress this warning,')[0];
      return `${prefix}: ${message}\n`;
    }
    if (event.item.type !== 'command_execution') return `[codex event] ${event.item.type ?? event.type}\n`;

    const summary = summarizeCommand(event.item.command);
    if (event.type === 'item.started' || event.item.status === 'in_progress') return `${summary}\n`;
    if (event.type !== 'item.completed') return `[codex event] ${event.type}\n`;

    const code = event.item.exit_code;
    const completed = code === 0 ? `${summary.replace(/^Reading /, 'Read ')} (exit code 0)`
      : `${summary} failed${code === undefined || code === null ? '' : ` (exit code ${code})`}`;
    const output = event.item.aggregated_output ? `\n${compactOutput(event.item.aggregated_output)}` : '';
    return `${completed}${output}\n`;
  }
}
