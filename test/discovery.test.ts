import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  type CatalogPet,
  discoverApi,
  downloadCatalog,
  downloadInstallPackage,
  MAX_CATALOG_BYTES,
  MAX_PACKAGE_BYTES,
  reportInstall,
} from '../src/discovery.js';
import { type CliError, ExitCode, type ExitCodeValue } from '../src/errors.js';

describe('catalog discovery and downloads', () => {
  it('accepts exact CDN discovery', async () => {
    await expect(
      discoverApi('https://pets.example', {
        fetchImpl: vi.fn(async () =>
          Response.json(discovery())
        ) as typeof fetch,
      })
    ).resolves.toMatchObject({
      apiBaseUrl: new URL('https://pets.example/api/v1/pub'),
      assetDelivery: 'cdn',
      assetOrigin: new URL('https://cdn.pets.example'),
      catalogUrl: new URL('https://cdn.pets.example/catalogs/v1/pets.json'),
      collectionCatalogUrl: new URL(
        'https://cdn.pets.example/catalogs/v1/collections.json'
      ),
    });
  });

  it('accepts exact local proxy discovery', async () => {
    const document = discovery({
      api: {
        ...discovery().api,
        baseUrl: 'http://localhost:3000/api/v1/pub',
      },
      assets: { delivery: 'proxy', origin: 'http://localhost:3000' },
      catalogUrl:
        'http://localhost:3000/api/storage/file?key=catalogs%2Fv1%2Fpets.json',
      collectionCatalogUrl:
        'http://localhost:3000/api/storage/file?key=catalogs%2Fv1%2Fcollections.json',
      docsUrl: 'http://localhost:3000/en/docs',
      siteUrl: 'http://localhost:3000',
    });
    await expect(
      discoverApi('http://localhost:3000', {
        fetchImpl: vi.fn(async () => Response.json(document)) as typeof fetch,
      })
    ).resolves.toMatchObject({ assetDelivery: 'proxy' });
  });

  it('rejects deprecated OpenAPI discovery metadata', async () => {
    const document = discovery();
    document.api = {
      ...document.api,
      openApiUrl:
        'https://cdn.pets.example/contracts/public/v1.0.0/openapi.json',
    } as typeof document.api;

    await expectFailure(
      discoverApi('https://pets.example', {
        fetchImpl: vi.fn(async () => Response.json(document)) as typeof fetch,
      }),
      ExitCode.Integrity
    );
  });

  it('requires the exact Collection catalog URL', async () => {
    const missing = discovery();
    delete (missing as Partial<typeof missing>).collectionCatalogUrl;
    await expectFailure(
      discoverApi('https://pets.example', {
        fetchImpl: vi.fn(async () => Response.json(missing)) as typeof fetch,
      }),
      ExitCode.Integrity
    );

    await expectFailure(
      discoverApi('https://pets.example', {
        fetchImpl: vi.fn(async () =>
          Response.json(
            discovery({
              collectionCatalogUrl:
                'https://evil.example/catalogs/v1/collections.json',
            })
          )
        ) as typeof fetch,
      }),
      ExitCode.Integrity
    );
  });

  it('downloads and validates a minified catalog regardless of Content-Length', async () => {
    const value = catalog();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(discovery()))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(value), {
          headers: {
            'Content-Length': '1',
            'Content-Type': 'application/json',
          },
        })
      );
    await expect(
      downloadCatalog({ fetchImpl, siteUrl: 'https://pets.example' })
    ).resolves.toMatchObject({ catalog: value });
  });

  it('limits catalog bytes after transparent decoding', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_CATALOG_BYTES));
        controller.enqueue(new Uint8Array([1]));
        controller.close();
      },
    });
    const discoveredApi = await discovered();
    await expectFailure(
      downloadCatalog({
        discoveredApi,
        fetchImpl: vi.fn(
          async () =>
            new Response(stream, {
              headers: { 'Content-Type': 'application/json' },
            })
        ) as typeof fetch,
      }),
      ExitCode.Integrity
    );
  });

  it('distinguishes missing Pet catalog data from missing discovery', async () => {
    const discoveredApi = await discovered();
    await expectFailure(
      downloadCatalog({
        discoveredApi,
        fetchImpl: vi.fn(
          async () => new Response(null, { status: 404 })
        ) as typeof fetch,
      }),
      ExitCode.Integrity
    );
    await expectFailure(
      discoverApi('https://pets.example', {
        fetchImpl: vi.fn(
          async () => new Response(null, { status: 404 })
        ) as typeof fetch,
      }),
      ExitCode.Network
    );
  });

  it('captures public API failure responses for debug output', async () => {
    await expect(
      discoverApi('https://pets.example', {
        fetchImpl: vi.fn(async () =>
          Response.json(
            { authorization: 'private', detail: 'Service unavailable.' },
            { status: 503 }
          )
        ) as typeof fetch,
      })
    ).rejects.toMatchObject({
      http: {
        response:
          '{"authorization":"[REDACTED]","detail":"Service unavailable."}',
        status: 503,
      },
    } satisfies Partial<CliError>);
  });

  it('rejects a catalog with an unexpected Content-Type', async () => {
    const discoveredApi = await discovered();

    await expectFailure(
      downloadCatalog({
        discoveredApi,
        fetchImpl: vi.fn(
          async () =>
            new Response(JSON.stringify(catalog()), {
              headers: { 'Content-Type': 'text/plain' },
            })
        ) as typeof fetch,
      }),
      ExitCode.Integrity
    );
  });

  it('rejects a catalog generatedAt value that is not RFC3339', async () => {
    const value = catalog();
    value.generatedAt = '2026-07-19';
    const discoveredApi = await discovered();

    await expectFailure(
      downloadCatalog({
        discoveredApi,
        fetchImpl: vi.fn(async () => Response.json(value)) as typeof fetch,
      }),
      ExitCode.Integrity
    );
  });

  it('accepts catalog slugs in deterministic code-point order', async () => {
    const value = catalog();
    value.pets = [
      { ...value.pets[0], slug: 'a-b' },
      { ...value.pets[0], slug: 'a_b' },
    ];
    value.total = value.pets.length;
    const discoveredApi = await discovered();

    await expect(
      downloadCatalog({
        discoveredApi,
        fetchImpl: vi.fn(async () => Response.json(value)) as typeof fetch,
      })
    ).resolves.toMatchObject({ catalog: value });
  });

  it('derives and validates package bytes from the catalog', async () => {
    const bytes = new TextEncoder().encode('package');
    const pet = catalogPet(bytes);
    const discoveredApi = await discovered();
    const fetchImpl = vi.fn(
      async () =>
        new Response(bytes, { headers: { 'Content-Type': 'application/zip' } })
    ) as typeof fetch;
    await expect(
      downloadInstallPackage(pet, { discoveredApi, fetchImpl })
    ).resolves.toMatchObject({
      bytes,
      metadata: { petSlug: 'sleepy-fox', sizeBytes: bytes.byteLength },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL(
        'https://cdn.pets.example/revisions/0197c001-7c00-7000-8000-000000000001/sleepy-fox.zip'
      ),
      expect.objectContaining({ redirect: 'error' })
    );
  });

  it('rejects package size, hash, type, and decoded body mismatches', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const discoveredApi = await discovered();
    const cases: Array<[CatalogPet, Response]> = [
      [
        {
          ...catalogPet(bytes),
          assets: {
            ...catalogPet(bytes).assets,
            byteSize: {
              ...catalogPet(bytes).assets.byteSize,
              package: MAX_PACKAGE_BYTES + 1,
            },
          },
        },
        packageResponse(bytes),
      ],
      [
        {
          ...catalogPet(bytes),
          assets: {
            ...catalogPet(bytes).assets,
            sha256: {
              ...catalogPet(bytes).assets.sha256,
              package: '0'.repeat(64),
            },
          },
        },
        packageResponse(bytes),
      ],
      [catalogPet(bytes), packageResponse(bytes, 'text/html')],
      [catalogPet(bytes), packageResponse(new Uint8Array([1, 2]))],
    ];
    for (const [pet, response] of cases) {
      await expectFailure(
        downloadInstallPackage(pet, {
          discoveredApi,
          fetchImpl: vi.fn(async () => response) as typeof fetch,
        }),
        ExitCode.Integrity
      );
    }
  });

  it('treats install reporting as best effort', async () => {
    const discoveredApi = await discovered();
    await expect(
      reportInstall('sleepy-fox', discoveredApi, {
        fetchImpl: vi.fn(async () => {
          throw new Error('offline');
        }) as typeof fetch,
      })
    ).resolves.toBe(false);
  });
});

async function discovered() {
  return await discoverApi('https://pets.example', {
    fetchImpl: vi.fn(async () => Response.json(discovery())) as typeof fetch,
  });
}

function discovery(overrides: Record<string, unknown> = {}) {
  return {
    api: {
      baseUrl: 'https://pets.example/api/v1/pub',
      currentVersion: 'v1',
      supportedVersions: ['v1'],
    },
    assets: { delivery: 'cdn', origin: 'https://cdn.pets.example' },
    catalogUrl: 'https://cdn.pets.example/catalogs/v1/pets.json',
    collectionCatalogUrl:
      'https://cdn.pets.example/catalogs/v1/collections.json',
    cli: { binary: 'petdb', minVersion: '1.0.0', packageName: 'codexpetdb' },
    docsUrl: 'https://pets.example/en/docs',
    product: 'CodexPetDB',
    schemaVersion: 1,
    siteUrl: 'https://pets.example',
    ...overrides,
  };
}

function catalog() {
  const pet = catalogPet(new Uint8Array([1]));
  return {
    assetBase: 'https://cdn.pets.example/',
    generatedAt: '2026-07-19T00:00:00.000Z',
    pets: [pet],
    schemaVersion: 1,
    total: 1,
  };
}

function catalogPet(bytes: Uint8Array): CatalogPet {
  return {
    assets: {
      byteSize: {
        manifest: 1,
        package: bytes.byteLength,
        poster: 1,
        spritesheet: 1,
      },
      prefix: 'revisions/0197c001-7c00-7000-8000-000000000001/',
      sha256: {
        manifest: 'a'.repeat(64),
        package: createHash('sha256').update(bytes).digest('hex'),
        poster: 'b'.repeat(64),
        spritesheet: 'c'.repeat(64),
      },
      spritesheetFile: 'spritesheet.webp',
    },
    author: 'Mira',
    displayName: 'Sleepy Fox',
    kind: 'creature',
    revision: { id: '0197c001-7c00-7000-8000-000000000001', number: 1 },
    slug: 'sleepy-fox',
  };
}

function packageResponse(bytes: Uint8Array, contentType = 'application/zip') {
  return new Response(Uint8Array.from(bytes).buffer, {
    headers: { 'Content-Type': contentType },
  });
}

async function expectFailure(
  promise: Promise<unknown>,
  exitCode: ExitCodeValue
) {
  await expect(promise).rejects.toEqual(
    expect.objectContaining<Partial<CliError>>({ exitCode })
  );
}
