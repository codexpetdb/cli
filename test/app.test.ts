import { strToU8, zipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import { run } from '../src/app.js';
import type { InstallDownload } from '../src/discovery.js';
import { CliError, ExitCode } from '../src/errors.js';

describe('CLI commands', () => {
  it('prints help', async () => {
    const output = outputs();
    await expect(run(['help'], output)).resolves.toBe(ExitCode.Success);
    expect(output.stdoutText()).toContain('petdb add <pet-id>');
    expect(output.stdoutText()).toContain(
      'petdb add-collection <collection-slug>'
    );
  });

  it('prints version', async () => {
    const output = outputs({ version: '9.8.7' });
    await expect(run(['version'], output)).resolves.toBe(ExitCode.Success);
    expect(output.stdoutText()).toBe('9.8.7\n');
  });

  it('installs a valid pet', async () => {
    const recover = vi.fn(async () => undefined);
    const output = outputs({
      download: vi.fn(async () => download('sleepy-fox')),
      install: vi.fn(async () => undefined),
      recover,
    });
    await expect(run(['add', 'sleepy-fox'], output)).resolves.toBe(
      ExitCode.Success
    );
    expect(output.install).toHaveBeenCalledOnce();
    expect(recover).toHaveBeenCalledOnce();
    expect(recover.mock.invocationCallOrder[0]).toBeLessThan(
      output.download.mock.invocationCallOrder[0]
    );
    expect(output.stdoutText()).toContain("Installed 'sleepy-fox'");
    expect(output.stdoutText()).toContain('pet v1, revision rev_1');
  });

  it('returns usage exit code for invalid commands and ids', async () => {
    const unknown = outputs();
    const invalidId = outputs();
    await expect(run(['remove'], unknown)).resolves.toBe(ExitCode.Usage);
    await expect(run(['add', 'Fox 2'], invalidId)).resolves.toBe(
      ExitCode.Usage
    );
  });

  it.each([
    ExitCode.Network,
    ExitCode.Integrity,
    ExitCode.FileSystem,
  ])('preserves domain exit code %s', async (exitCode) => {
    const output = outputs({
      download: vi.fn(async () => {
        throw new CliError('injected failure', exitCode);
      }),
    });
    await expect(run(['add', 'sleepy-fox'], output)).resolves.toBe(exitCode);
    expect(output.stderrText()).toContain('injected failure');
  });

  it('discovers once and installs a collection in manifest order', async () => {
    const discoveredApi = {
      apiBaseUrl: new URL('https://pets.example/api/v1/pub'),
      assetOrigin: new URL('https://cdn.pets.example'),
    };
    const discover = vi.fn(async () => discoveredApi);
    const downloadPet = vi.fn(
      async (id: string, _options?: { discoveredApi?: unknown }) => download(id)
    );
    const install = vi.fn(async () => undefined);
    const output = outputs({
      collectionManifest: vi.fn(async () => ({
        collectionId: 'forest-friends',
        petIds: ['sleepy-fox', 'boba-bear'],
      })),
      discover,
      download: downloadPet,
      install,
    });

    await expect(
      run(['add-collection', 'forest-friends'], output)
    ).resolves.toBe(ExitCode.Success);
    expect(discover).toHaveBeenCalledOnce();
    expect(downloadPet.mock.calls.map(([id]) => id)).toEqual([
      'sleepy-fox',
      'boba-bear',
    ]);
    expect(
      downloadPet.mock.calls.every(
        ([, options]) => options?.discoveredApi === discoveredApi
      )
    ).toBe(true);
    expect(install).toHaveBeenCalledTimes(2);
    expect(output.stdoutText()).toContain(
      "Installed collection 'forest-friends' (2 pets)."
    );
  });

  it('stops on the first failed pet and preserves its exit code', async () => {
    const install = vi.fn(async () => undefined);
    let secondPetFails = true;
    const downloadPet = vi.fn(async (id: string) => {
      if (id === 'boba-bear' && secondPetFails) {
        throw new CliError('package unavailable', ExitCode.Network);
      }
      return download(id);
    });
    const output = outputs({
      collectionManifest: vi.fn(async () => ({
        collectionId: 'forest-friends',
        petIds: ['sleepy-fox', 'boba-bear'],
      })),
      discover: vi.fn(async () => ({
        apiBaseUrl: new URL('https://pets.example/api/v1/pub'),
        assetOrigin: new URL('https://cdn.pets.example'),
      })),
      download: downloadPet,
      install,
    });

    await expect(
      run(['add-collection', 'forest-friends'], output)
    ).resolves.toBe(ExitCode.Network);
    expect(install).toHaveBeenCalledOnce();
    expect(output.stderrText()).toContain('stopped after 1 of 2 pets');
    expect(output.stderrText()).toContain('package unavailable');

    secondPetFails = false;
    await expect(
      run(['add-collection', 'forest-friends'], output)
    ).resolves.toBe(ExitCode.Success);
    expect(install).toHaveBeenCalledTimes(3);
    expect(downloadPet.mock.calls.map(([id]) => id)).toEqual([
      'sleepy-fox',
      'boba-bear',
      'sleepy-fox',
      'boba-bear',
    ]);
  });
});

function download(id: string): InstallDownload {
  const bytes = petArchive(id);
  return {
    bytes,
    metadata: {
      petId: id,
      petVersion: 1,
      revisionId: 'rev_1',
      sha256: '0'.repeat(64),
      sizeBytes: bytes.byteLength,
    },
  };
}

function outputs(overrides: Record<string, unknown> = {}) {
  let stdout = '';
  let stderr = '';
  return {
    recover: vi.fn(async () => undefined),
    stderr: {
      write: (value: string | Uint8Array) => {
        stderr += value;
      },
    },
    stdout: {
      write: (value: string | Uint8Array) => {
        stdout += value;
      },
    },
    stderrText: () => stderr,
    stdoutText: () => stdout,
    ...overrides,
  } as any;
}

function petArchive(id: string): Uint8Array {
  return zipSync({
    'pet.json': strToU8(
      JSON.stringify({ id, spritesheetPath: 'spritesheet.png' })
    ),
    'spritesheet.png': new Uint8Array([1, 2, 3]),
  });
}
