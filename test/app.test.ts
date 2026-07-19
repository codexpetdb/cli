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
  siteUrl: new URL('https://pets.example'),
};

describe('CLI commands', () => {
  it('prints the first-release help', async () => {
    const output = dependencies();
    await expect(run(['help'], output)).resolves.toBe(ExitCode.Success);
    expect(output.stdoutText()).toContain('petdb list');
    expect(output.stdoutText()).toContain('petdb install <pet-slug>');
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

  it('fetches discovery, catalog, and collection manifest once', async () => {
    const discover = vi.fn(async () => discoveredApi);
    const catalog = vi.fn(async () => ({
      catalog: fixtureCatalog(),
      discoveredApi,
    }));
    const manifest = vi.fn(async () => ({
      collectionSlug: 'forest-friends',
      petSlugs: ['sleepy-fox', 'boba-bear'],
    }));
    const install = vi.fn(async () => undefined);
    const output = dependencies({
      catalog,
      collectionManifest: manifest,
      discover,
      install,
    });
    await expect(
      run(['install', '--collection', 'forest-friends'], output)
    ).resolves.toBe(ExitCode.Success);
    expect(discover).toHaveBeenCalledOnce();
    expect(catalog).toHaveBeenCalledOnce();
    expect(manifest).toHaveBeenCalledOnce();
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
});

function dependencies(overrides: Record<string, unknown> = {}) {
  let stdout = '';
  let stderr = '';
  return {
    catalog: vi.fn(async () => ({ catalog: fixtureCatalog(), discoveredApi })),
    collectionManifest: vi.fn(async () => ({
      collectionSlug: 'forest-friends',
      petSlugs: ['sleepy-fox', 'boba-bear'],
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
