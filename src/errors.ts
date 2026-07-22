export const ExitCode = {
  Success: 0,
  Usage: 2,
  Network: 3,
  Integrity: 4,
  FileSystem: 5,
  Auth: 6,
  Service: 7,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

const MAX_DEBUG_RESPONSE_BYTES = 16 * 1024;
const REDACTED = '[REDACTED]';
const TRUNCATED = '… [truncated]';
const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|password|secret|token|api[-_]?key/iu;

export interface HttpDebugInfo {
  readonly response: string;
  readonly status: number;
}

interface CliErrorOptions extends ErrorOptions {
  http?: HttpDebugInfo;
}

export class CliError extends Error {
  readonly exitCode: ExitCodeValue;
  readonly http?: HttpDebugInfo;

  constructor(
    message: string,
    exitCode: ExitCodeValue,
    options?: CliErrorOptions
  ) {
    super(message, options ? { cause: options.cause } : undefined);
    this.name = 'CliError';
    this.exitCode = exitCode;
    this.http = options?.http;
  }
}

export function createHttpDebugInfo(
  status: number,
  response: unknown
): HttpDebugInfo {
  return {
    response: truncateDebugResponse(serializeDebugResponse(response)),
    status,
  };
}

export async function captureHttpDebug(
  response: Response
): Promise<HttpDebugInfo> {
  if (!response.body) {
    return createHttpDebugInfo(response.status, '[empty response body]');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  let truncated = false;
  try {
    while (byteLength <= MAX_DEBUG_RESPONSE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = MAX_DEBUG_RESPONSE_BYTES + 1 - byteLength;
      const chunk = value.subarray(0, remaining);
      chunks.push(chunk);
      byteLength += chunk.byteLength;
      if (
        value.byteLength > remaining ||
        byteLength > MAX_DEBUG_RESPONSE_BYTES
      ) {
        truncated = true;
        await reader.cancel();
        break;
      }
    }
  } catch (error) {
    return createHttpDebugInfo(
      response.status,
      `[unable to read response body: ${errorMessage(error)}]`
    );
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const body = new TextDecoder().decode(
    bytes.subarray(0, MAX_DEBUG_RESPONSE_BYTES)
  );
  return createHttpDebugInfo(
    response.status,
    `${body || '[empty response body]'}${truncated ? '… [truncated]' : ''}`
  );
}

export function findHttpDebugInfo(error: unknown): HttpDebugInfo | undefined {
  const seen = new Set<unknown>();
  let current = error;
  for (let depth = 0; depth < 16 && current !== undefined; depth += 1) {
    if (seen.has(current)) return undefined;
    seen.add(current);
    if (current instanceof CliError && current.http) return current.http;
    if (!(current instanceof Error)) return undefined;
    current = current.cause;
  }
  return undefined;
}

function serializeDebugResponse(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.stringify(redactValue(JSON.parse(trimmed), new WeakSet()));
      } catch {
        // Preserve non-JSON response text below.
      }
    }
    return redactString(value);
  }
  try {
    return JSON.stringify(redactValue(value, new WeakSet())) ?? String(value);
  } catch {
    return redactString(String(value));
  }
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return redactString(value);
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
  }
  const redacted: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    redacted[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? REDACTED
      : redactValue(item, seen);
  }
  return redacted;
}

function redactString(value: string): string {
  return value
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/giu, `$1${REDACTED}`)
    .replace(
      /((?:access[_-]?token|refresh[_-]?token|authorization|cookie|password|secret|api[_-]?key)\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s&,;]+)/giu,
      `$1${REDACTED}`
    )
    .replace(
      /([?&](?:access[_-]?token|refresh[_-]?token|token|signature|secret|api[_-]?key)=)[^&#\s]+/giu,
      `$1${REDACTED}`
    );
}

function truncateDebugResponse(value: string): string {
  if (Buffer.byteLength(value, 'utf8') <= MAX_DEBUG_RESPONSE_BYTES) {
    return value;
  }
  const availableBytes =
    MAX_DEBUG_RESPONSE_BYTES - Buffer.byteLength(TRUNCATED, 'utf8');
  let lower = 0;
  let upper = value.length;
  while (lower < upper) {
    const middle = Math.ceil((lower + upper) / 2);
    if (Buffer.byteLength(value.slice(0, middle), 'utf8') <= availableBytes) {
      lower = middle;
    } else {
      upper = middle - 1;
    }
  }
  return `${value.slice(0, lower)}${TRUNCATED}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
