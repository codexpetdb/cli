import { createHash } from 'node:crypto';
import { strToU8, zipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import { run } from '../src/app.js';
import type {
  CatalogPet,
  DiscoveredApi,
  InstallDownload,
  PublicPetCatalog,
} from '../src/discovery.js';
import { CliError, ExitCode } from '../src/errors.js';

const discoveredApi: DiscoveredApi = {
  apiBaseUrl: new URL('https://pets.example/api/v1/pub'),
  assetDelivery: 'cdn',
  assetOrigin: new URL('https://cdn.pets.example'),
  catalogUrl: new URL('https://cdn.pets.example/catalogs/v1/pets.json'),
  collectionCatalogUrl: new URL(
    'https://cdn.pets.example/catalogs/v1/collections.json'
  ),
  siteUrl: new URL('https://pets.example'),
};

describe('CLI commands', () => {
  it('prints the first-release help', async () => {
    const output = dependencies();
    await expect(run(['help'], output)).resolves.toBe(ExitCode.Success);
    expect(output.stdoutText()).toContain('petdb list');
    expect(output.stdoutText()).toContain('petdb install <pet-slug>');
    expect(output.stdoutText()).toContain('--debug');
    expect(output.stdoutText()).not.toContain('petdb add');
  });

  it('lists the catalog in stable catalog order', async () => {
    const output = dependencies();
    await expect(run(['list'], output)).resolves.toBe(ExitCode.Success);
    expect(output.stdoutText()).toContain('CodexPetDB pets (2)');
    expect(output.stdoutText()).toContain('sleepy-fox\tSleepy Fox\tby Mira');
    expect(output.stdoutText()).toContain('petdb install <pet-slug>');
  });

  it('installs by slug and reports only after local installation', async () => {
    const install = vi.fn(async () => undefined);
    const report = vi.fn(async () => true);
    const output = dependencies({ install, report });
    await expect(run(['install', 'sleepy-fox'], output)).resolves.toBe(
      ExitCode.Success
    );
    expect(install).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledWith(
      'sleepy-fox',
      discoveredApi,
      expect.any(Object)
    );
    expect(install.mock.invocationCallOrder[0]).toBeLessThan(
      report.mock.invocationCallOrder[0]
    );
  });

  it('fetches discovery and both catalogs once', async () => {
    const discover = vi.fn(async () => discoveredApi);
    const catalog = vi.fn(async () => ({
      catalog: fixtureCatalog(),
      discoveredApi,
    }));
    const collections = vi.fn(async () => ({
      catalog: fixtureCollectionCatalog(),
      discoveredApi,
    }));
    const install = vi.fn(async () => undefined);
    const output = dependencies({
      catalog,
      collectionCatalog: collections,
      discover,
      install,
    });
    await expect(
      run(['install', '--collection', 'forest-friends'], output)
    ).resolves.toBe(ExitCode.Success);
    expect(discover).toHaveBeenCalledOnce();
    expect(catalog).toHaveBeenCalledOnce();
    expect(collections).toHaveBeenCalledOnce();
    expect(install).toHaveBeenCalledTimes(2);
  });

  it('stops a collection on the first failure and keeps completed installs', async () => {
    const install = vi.fn(async () => undefined);
    const download = vi.fn(async (pet: CatalogPet) => {
      if (pet.slug === 'boba-bear') {
        throw new CliError('package unavailable', ExitCode.Network);
      }
      return installDownload(pet.slug);
    });
    const output = dependencies({ download, install });
    await expect(
      run(['install', '--collection', 'forest-friends'], output)
    ).resolves.toBe(ExitCode.Network);
    expect(install).toHaveBeenCalledOnce();
    expect(output.stderrText()).toContain('stopped after 1 of 2 pets');
  });

  it('fails before installation when the two catalogs are inconsistent', async () => {
    const install = vi.fn(async () => undefined);
    const output = dependencies({
      collectionCatalog: vi.fn(async () => ({
        catalog: fixtureCollectionCatalog(['missing']),
        discoveredApi,
      })),
      install,
    });

    await expect(
      run(['install', '--collection', 'forest-friends'], output)
    ).resolves.toBe(ExitCode.Integrity);
    expect(install).not.toHaveBeenCalled();
    expect(output.stderrText()).toContain('catalogs may be updating');
  });

  it('rejects removed aliases and invalid arguments', async () => {
    for (const args of [
      ['add', 'sleepy-fox'],
      ['add-collection', 'forest-friends'],
      ['install'],
      ['install', 'Fox 2'],
      ['list', '--json'],
    ]) {
      await expect(run(args, dependencies())).resolves.toBe(ExitCode.Usage);
    }
  });

  it('dispatches account and submit commands with parsed options', async () => {
    const login = vi.fn(async () => undefined);
    const logout = vi.fn(async () => undefined);
    const submit = vi.fn(async () => undefined);
    const whoami = vi.fn(async () => undefined);
    const output = dependencies({ login, logout, submit, whoami });

    await expect(run(['login'], output)).resolves.toBe(ExitCode.Success);
    await expect(run(['logout', '--local-only'], output)).resolves.toBe(
      ExitCode.Success
    );
    await expect(run(['whoami'], output)).resolves.toBe(ExitCode.Success);
    await expect(
      run(['submit', './pet-package', '--yes'], output)
    ).resolves.toBe(ExitCode.Success);

    expect(login).toHaveBeenCalledOnce();
    expect(logout).toHaveBeenCalledWith(output, true);
    expect(whoami).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledWith(
      './pet-package',
      { interactive: process.stdin.isTTY === true, yes: true },
      output
    );
  });

  it('prints HTTP diagnostics only when --debug is enabled', async () => {
    const failure = new CliError('The session is invalid.', ExitCode.Auth, {
      http: {
        response: '{"detail":"The session is invalid."}',
        status: 401,
      },
    });
    const withoutDebug = dependencies({
      whoami: vi.fn(async () => {
        throw failure;
      }),
    });
    await expect(run(['whoami'], withoutDebug)).resolves.toBe(ExitCode.Auth);
    expect(withoutDebug.stderrText()).toBe('petdb: The session is invalid.\n');

    const withDebug = dependencies({
      whoami: vi.fn(async () => {
        throw new CliError('Account lookup failed.', ExitCode.Auth, {
          cause: failure,
        });
      }),
    });
    await expect(run(['whoami', '--debug'], withDebug)).resolves.toBe(
      ExitCode.Auth
    );
    expect(withDebug.stderrText()).toContain('petdb debug: HTTP 401\n');
    expect(withDebug.stderrText()).toContain(
      'petdb debug: response: {"detail":"The session is invalid."}\n'
    );
  });

  it('accepts --debug before a command and rejects duplicates', async () => {
    const whoami = vi.fn(async () => undefined);
    await expect(
      run(['--debug', 'whoami'], dependencies({ whoami }))
    ).resolves.toBe(ExitCode.Success);
    expect(whoami).toHaveBeenCalledOnce();

    await expect(
      run(['--debug', 'whoami', '--debug'], dependencies({ whoami }))
    ).resolves.toBe(ExitCode.Usage);
  });

  it('parses edit combinations and rejects ambiguous options', async () => {
    const edit = vi.fn(async () => undefined);
    const output = dependencies({ edit });

    await expect(
      run(
        [
          'edit',
          'sleepy-fox',
          '--display-name',
          'Sleepier Fox',
          '--spritesheet',
          './spritesheet.webp',
        ],
        output
      )
    ).resolves.toBe(ExitCode.Success);
    expect(edit).toHaveBeenCalledWith(
      'sleepy-fox',
      {
        displayName: 'Sleepier Fox',
        spritesheetPath: './spritesheet.webp',
      },
      output
    );

    for (const args of [
      ['edit', 'sleepy-fox'],
      ['edit', 'sleepy-fox', '--zip', './pet.zip', '--manifest', './pet.json'],
      ['edit', 'sleepy-fox', '--description'],
    ]) {
      await expect(run(args, dependencies({ edit }))).resolves.toBe(
        ExitCode.Usage
      );
    }
  });
});

function dependencies(overrides: Record<string, unknown> = {}) {
  let stdout = '';
  let stderr = '';
  return {
    catalog: vi.fn(async () => ({ catalog: fixtureCatalog(), discoveredApi })),
    collectionCatalog: vi.fn(async () => ({
      catalog: fixtureCollectionCatalog(),
      discoveredApi,
    })),
    discover: vi.fn(async () => discoveredApi),
    download: vi.fn(async (pet: CatalogPet) => installDownload(pet.slug)),
    install: vi.fn(async () => undefined),
    recover: vi.fn(async () => undefined),
    report: vi.fn(async () => true),
    stderr: {
      write: (value: string | Uint8Array) => {
        stderr += value;
      },
    },
    stderrText: () => stderr,
    stdout: {
      write: (value: string | Uint8Array) => {
        stdout += value;
      },
    },
    stdoutText: () => stdout,
    ...overrides,
  } as any;
}

function fixtureCollectionCatalog(petSlugs = ['sleepy-fox', 'boba-bear']) {
  return {
    collections: [{ name: 'Forest friends', petSlugs, slug: 'forest-friends' }],
    generatedAt: '2026-07-19T00:00:00.000Z',
    schemaVersion: 1 as const,
    total: 1,
  };
}

function fixtureCatalog(): PublicPetCatalog {
  const pets = [
    catalogPet('sleepy-fox', 'Sleepy Fox'),
    catalogPet('boba-bear', 'Boba Bear'),
  ];
  return {
    assetBase: 'https://cdn.pets.example/',
    generatedAt: '2026-07-19T00:00:00.000Z',
    pets,
    schemaVersion: 1,
    total: pets.length,
  };
}

function catalogPet(slug: string, displayName: string): CatalogPet {
  const archive = petArchive(slug);
  return {
    assets: {
      byteSize: {
        manifest: 1,
        package: archive.byteLength,
        poster: 1,
        spritesheet: 3,
      },
      prefix: 'revisions/0197c001-7c00-7000-8000-000000000001/',
      sha256: {
        manifest: 'a'.repeat(64),
        package: createHash('sha256').update(archive).digest('hex'),
        poster: 'b'.repeat(64),
        spritesheet: 'c'.repeat(64),
      },
      spritesheetFile: 'spritesheet.png',
    },
    author: 'Mira',
    displayName,
    kind: 'creature',
    revision: { id: '0197c001-7c00-7000-8000-000000000001', number: 1 },
    slug,
  };
}

function installDownload(slug: string): InstallDownload {
  const bytes = petArchive(slug);
  return {
    bytes,
    metadata: {
      petSlug: slug,
      revisionId: '0197c001-7c00-7000-8000-000000000001',
      revisionNumber: 1,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      sizeBytes: bytes.byteLength,
    },
  };
}

function petArchive(slug: string): Uint8Array {
  return zipSync({
    'pet.json': strToU8(
      JSON.stringify({ id: slug, spritesheetPath: 'spritesheet.png' })
    ),
    'spritesheet.png': new Uint8Array([1, 2, 3]),
  });
}
