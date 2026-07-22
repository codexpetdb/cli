import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@napi-rs/keyring', () => ({
  AsyncEntry: class {
    async deleteCredential(): Promise<void> {
      throw new Error('Keychain unavailable');
    }

    async getPassword(): Promise<string | null> {
      throw new Error('Keychain unavailable');
    }

    async setPassword(): Promise<void> {
      throw new Error('Keychain unavailable');
    }
  },
}));

import {
  credentialFilePath,
  deleteCredential,
  loadCredential,
  normalizeSiteOrigin,
  saveCredential,
} from '../src/credentials.js';

describe('credential store', () => {
  let directory = '';

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'petdb-credentials-'));
    vi.stubEnv('XDG_CONFIG_HOME', directory);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(directory, { force: true, recursive: true });
  });

  it('falls back to an atomic site-isolated credential file', async () => {
    const first = {
      expiresAt: '2026-08-01T00:00:00.000Z',
      token: 'first-secret',
    };
    const second = {
      expiresAt: '2026-08-02T00:00:00.000Z',
      token: 'second-secret',
    };

    await expect(saveCredential('https://one.example', first)).resolves.toBe(
      'file'
    );
    await expect(saveCredential('https://two.example/', second)).resolves.toBe(
      'file'
    );
    await expect(loadCredential('https://one.example/')).resolves.toEqual(
      first
    );
    await expect(loadCredential('https://two.example')).resolves.toEqual(
      second
    );

    const file = credentialFilePath();
    const parsed = JSON.parse(await readFile(file, 'utf8')) as {
      credentials: Record<string, { token: string }>;
    };
    expect(Object.keys(parsed.credentials).sort()).toEqual([
      'https://one.example',
      'https://two.example',
    ]);
    if (process.platform !== 'win32') {
      expect((await stat(file)).mode & 0o777).toBe(0o600);
    }

    await deleteCredential('https://one.example');
    await expect(loadCredential('https://one.example')).resolves.toBeNull();
    await expect(loadCredential('https://two.example')).resolves.toEqual(
      second
    );
  });

  it('normalizes only path-free HTTP(S) origins', () => {
    expect(normalizeSiteOrigin('https://pets.example/')).toBe(
      'https://pets.example'
    );
    expect(() => normalizeSiteOrigin('https://pets.example/path')).toThrow(
      'site origin without a path'
    );
    expect(() => normalizeSiteOrigin('file:///tmp/pets')).toThrow(
      'site origin without a path'
    );
  });
});
