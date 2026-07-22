import { describe, expect, it } from 'vitest';
import { createHttpDebugInfo } from '../src/errors.js';

describe('HTTP debug diagnostics', () => {
  it('redacts nested credentials and sensitive URL parameters', () => {
    const debug = createHttpDebugInfo(500, {
      authorization: 'Bearer private-token',
      detail:
        'Retry https://uploads.example/object?signature=private-signature',
      nested: { refresh_token: 'private-refresh-token' },
    });

    expect(debug.response).toContain('"authorization":"[REDACTED]"');
    expect(debug.response).toContain('signature=[REDACTED]');
    expect(debug.response).toContain('"refresh_token":"[REDACTED]"');
    expect(debug.response).not.toContain('private');
  });

  it('limits response output to 16 KiB', () => {
    const debug = createHttpDebugInfo(503, '界'.repeat(10_000));

    expect(Buffer.byteLength(debug.response, 'utf8')).toBeLessThanOrEqual(
      16 * 1024
    );
    expect(debug.response.endsWith('… [truncated]')).toBe(true);
  });
});
