import { describe, expect, it, vi } from 'vitest';
import {
  buildCollectionManifestUrl,
  downloadCollectionManifest,
  MAX_COLLECTION_PETS,
  validateCollectionManifest,
} from '../src/collection.js';
import type { DiscoveredApi } from '../src/discovery.js';
import { type CliError, ExitCode } from '../src/errors.js';

const discoveredApi: DiscoveredApi = {
  apiBaseUrl: new URL('https://pets.example/api/v1/pub'),
  assetOrigin: new URL('https://cdn.pets.example'),
};

describe('collection manifest', () => {
  it('builds the fixed v1 collection manifest endpoint', () => {
    expect(
      buildCollectionManifestUrl(discoveredApi.apiBaseUrl, 'forest-friends')
        .href
    ).toBe(
      'https://pets.example/api/v1/pub/collections/forest-friends/manifest'
    );
  });

  it('accepts empty and ordered manifests', () => {
    expect(
      validateCollectionManifest(manifest([]), 'forest-friends', discoveredApi)
    ).toEqual({ collectionId: 'forest-friends', petIds: [] });
    expect(
      validateCollectionManifest(
        manifest(['sleepy-fox', 'boba-bear']),
        'forest-friends',
        discoveredApi
      )
    ).toEqual({
      collectionId: 'forest-friends',
      petIds: ['sleepy-fox', 'boba-bear'],
    });
  });

  it('uses the slug as the requested identity while retaining the internal id', () => {
    expect(
      validateCollectionManifest(
        {
          ...manifest(['sleepy-fox']),
          collectionId: 'collection-internal-019f74d5',
          collectionSlug: 'forest-friends',
        },
        'forest-friends',
        discoveredApi
      )
    ).toEqual({
      collectionId: 'collection-internal-019f74d5',
      collectionSlug: 'forest-friends',
      petIds: ['sleepy-fox'],
    });
  });

  it('strictly rejects id mismatches, duplicate pets, extra keys, and oversized collections', () => {
    const cases = [
      { ...manifest([]), collectionId: 'another-collection' },
      manifest(['sleepy-fox', 'sleepy-fox']),
      { ...manifest([]), extra: true },
      manifest(
        Array.from(
          { length: MAX_COLLECTION_PETS + 1 },
          (_, index) => `pet-${index}`
        )
      ),
    ];
    for (const value of cases) {
      expect(() =>
        validateCollectionManifest(value, 'forest-friends', discoveredApi)
      ).toThrowError(
        expect.objectContaining<Partial<CliError>>({
          exitCode: ExitCode.Integrity,
        })
      );
    }
  });

  it('rejects invalid pet ids and package origins', () => {
    for (const value of [
      manifest(['not safe']),
      {
        ...manifest([]),
        pets: [{ id: 'sleepy-fox', package: 'https://evil.example/fox.zip' }],
      },
      {
        ...manifest([]),
        pets: [
          {
            id: 'sleepy-fox',
            package: 'https://user@cdn.pets.example/fox.zip',
          },
        ],
      },
    ]) {
      expect(() =>
        validateCollectionManifest(value, 'forest-friends', discoveredApi)
      ).toThrowError(
        expect.objectContaining<Partial<CliError>>({
          exitCode: ExitCode.Integrity,
        })
      );
    }
  });

  it('rejects manifest redirects', async () => {
    const response = Response.json(manifest([]));
    Object.defineProperty(response, 'redirected', { value: true });
    await expect(
      downloadCollectionManifest('forest-friends', {
        discoveredApi,
        fetchImpl: vi.fn(async () => response) as typeof fetch,
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<CliError>>({
        exitCode: ExitCode.Network,
      })
    );
  });
});

function manifest(ids: string[]) {
  return {
    collectionId: 'forest-friends',
    pets: ids.map((id) => ({
      id,
      package: `https://cdn.pets.example/packages/${id}.zip`,
    })),
    schemaVersion: 1,
  };
}
