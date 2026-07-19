import { describe, expect, it, vi } from 'vitest';
import {
  downloadCollectionCatalog,
  findCatalogCollection,
  MAX_COLLECTION_CATALOG_BYTES,
  MAX_COLLECTION_PETS,
  validateCollectionCatalog,
} from '../src/collection.js';
import type { DiscoveredApi } from '../src/discovery.js';
import { type CliError, ExitCode } from '../src/errors.js';

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

describe('Collection catalog', () => {
  it('preserves Pet order and finds a collection by slug', () => {
    const catalog = validateCollectionCatalog(
      collectionCatalog([
        collection('forest-friends', ['sleepy-fox', 'boba-bear']),
      ])
    );

    expect(findCatalogCollection(catalog, 'forest-friends')).toEqual({
      name: 'Forest friends',
      petSlugs: ['sleepy-fox', 'boba-bear'],
      slug: 'forest-friends',
    });
  });

  it('rejects duplicates, extras, invalid slugs, oversized lists, and unstable order', () => {
    const cases = [
      collectionCatalog([
        collection('forest-friends', ['sleepy-fox', 'sleepy-fox']),
      ]),
      { ...collectionCatalog([]), extra: true },
      collectionCatalog([collection('forest-friends', ['not safe'])]),
      collectionCatalog([collection('Forest_Friends', [])]),
      collectionCatalog([
        collection(
          'forest-friends',
          Array.from(
            { length: MAX_COLLECTION_PETS + 1 },
            (_, index) => `pet-${index}`
          )
        ),
      ]),
      collectionCatalog([collection('z-last', []), collection('a-first', [])]),
    ];
    for (const value of cases) {
      expect(() => validateCollectionCatalog(value)).toThrowError(
        expect.objectContaining<Partial<CliError>>({
          exitCode: ExitCode.Integrity,
        })
      );
    }
  });

  it('reports missing and empty collections as integrity errors', () => {
    const catalog = validateCollectionCatalog(
      collectionCatalog([collection('empty', [])])
    );
    for (const slug of ['missing', 'empty']) {
      expect(() => findCatalogCollection(catalog, slug)).toThrowError(
        expect.objectContaining<Partial<CliError>>({
          exitCode: ExitCode.Integrity,
        })
      );
    }
  });

  it('downloads once, rejects redirects, and limits decoded bytes', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(collectionCatalog([]))
    ) as typeof fetch;
    await expect(
      downloadCollectionCatalog({ discoveredApi, fetchImpl })
    ).resolves.toMatchObject({ catalog: { total: 0 } });
    expect(fetchImpl).toHaveBeenCalledOnce();

    const redirected = Response.json(collectionCatalog([]));
    Object.defineProperty(redirected, 'redirected', { value: true });
    await expect(
      downloadCollectionCatalog({
        discoveredApi,
        fetchImpl: vi.fn(async () => redirected) as typeof fetch,
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<CliError>>({ exitCode: ExitCode.Network })
    );

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_COLLECTION_CATALOG_BYTES));
        controller.enqueue(new Uint8Array([1]));
        controller.close();
      },
    });
    await expect(
      downloadCollectionCatalog({
        discoveredApi,
        fetchImpl: vi.fn(
          async () =>
            new Response(stream, {
              headers: { 'Content-Type': 'application/json' },
            })
        ) as typeof fetch,
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<CliError>>({
        exitCode: ExitCode.Integrity,
      })
    );
  });

  it('reports a missing published catalog as an integrity error', async () => {
    for (const status of [404, 410]) {
      await expect(
        downloadCollectionCatalog({
          discoveredApi,
          fetchImpl: vi.fn(
            async () => new Response(null, { status })
          ) as typeof fetch,
        })
      ).rejects.toEqual(
        expect.objectContaining<Partial<CliError>>({
          exitCode: ExitCode.Integrity,
        })
      );
    }
  });
});

function collection(slug: string, petSlugs: string[]) {
  return {
    name:
      slug === 'forest-friends' ? 'Forest friends' : slug.replaceAll('-', ' '),
    petSlugs,
    slug,
  };
}

function collectionCatalog(collections: ReturnType<typeof collection>[]) {
  return {
    collections,
    generatedAt: '2026-07-19T00:00:00.000Z',
    schemaVersion: 1,
    total: collections.length,
  };
}
