import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  browser: {
    on: vi.fn(),
    unref: vi.fn(),
  },
  loadCredential: vi.fn(async () => null),
  pollDeviceToken: vi.fn(async () => ({
    description: 'Device authorization denied.',
    status: 'access_denied' as const,
  })),
  requestDeviceCode: vi.fn(async () => ({
    device_code: 'private-device-code',
    expires_in: 600,
    interval: 0,
    user_code: 'COPY1234',
    verification_uri: 'https://pets.example/cli/device',
    verification_uri_complete:
      'https://pets.example/cli/device?user_code=COPY1234',
  })),
  spawn: vi.fn(),
}));

mocks.spawn.mockReturnValue(mocks.browser);

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  spawn: mocks.spawn,
}));

vi.mock('../src/api.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api.js')>()),
  pollDeviceToken: mocks.pollDeviceToken,
  requestDeviceCode: mocks.requestDeviceCode,
}));

vi.mock('../src/credentials.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/credentials.js')>()),
  loadCredential: mocks.loadCredential,
}));

import { loginCommand } from '../src/commands.js';

describe('account commands', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('prints the complete device authorization URL for copying', async () => {
    let stdout = '';

    await expect(
      loginCommand({
        stderr: { write: vi.fn() },
        stdout: {
          write: (value) => {
            stdout += value;
            return true;
          },
        },
      })
    ).rejects.toMatchObject({ message: 'Device authorization denied.' });

    expect(stdout).toContain(
      'Open: https://pets.example/cli/device?user_code=COPY1234\n'
    );
    expect(stdout).toContain('Code: COPY1234\n');
    expect(mocks.spawn).toHaveBeenCalledOnce();
    expect(mocks.spawn.mock.calls[0]?.[1]).toContain(
      'https://pets.example/cli/device?user_code=COPY1234'
    );
  });
});
