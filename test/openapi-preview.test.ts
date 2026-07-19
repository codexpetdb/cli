import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { describe, expect, it } from 'vitest';

describe('OpenAPI preview', () => {
  it('serves the contract through Scalar', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
    expect(packageJson.scripts['openapi:preview']).toContain('--port 4001');

    const port = await availablePort();
    const result = spawnSync(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      [
        'exec',
        'scalar',
        'document',
        'serve',
        'contracts/openapi.json',
        '--once',
        '--port',
        String(port),
      ],
      { encoding: 'utf8' }
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('CodexPetDB Public API');
    expect(result.stdout).toContain('13 paths, 26 operations');
    expect(result.stdout).toContain(
      `API Reference Server listening on http://localhost:${port}`
    );
  });
});

async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to allocate a preview test port.');
  }
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  return address.port;
}
