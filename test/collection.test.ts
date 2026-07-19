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
  assetDelivery: 'cdn',
  assetOrigin: new URL('https://cdn.pets.example'),
  catalogUrl: new URL('https://cdn.pets.example/catalogs/v1/pets.json'),
  siteUrl: new URL('https://pets.example'),
};

describe('collection manifest', () => {
  it('uses the fixed v1 endpoint and preserves pet order', () => {
    expect(
      buildCollectionManifestUrl(discoveredApi.apiBaseUrl, 'forest-friends')
        .href
    ).toBe(
      'https://pets.example/api/v1/pub/collections/forest-friends/manifest'
    );
    expect(
      validateCollectionManifest(
        manifest(['sleepy-fox', 'boba-bear']),
        'forest-friends',
        discoveredApi
      )
    ).toEqual({
      collectionSlug: 'forest-friends',
      petSlugs: ['sleepy-fox', 'boba-bear'],
    });
  });

  it('rejects mismatches, duplicates, extras, invalid slugs, and oversized lists', () => {
    const cases = [
      { ...manifest([]), collectionSlug: 'other' },
      manifest(['sleepy-fox', 'sleepy-fox']),
      { ...manifest([]), extra: true },
      manifest(['not safe']),
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

  it('rejects manifest redirects', async () => {
    const response = Response.json(manifest([]));
    Object.defineProperty(response, 'redirected', { value: true });
    await expect(
      downloadCollectionManifest('forest-friends', {
        discoveredApi,
        fetchImpl: vi.fn(async () => response) as typeof fetch,
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<CliError>>({ exitCode: ExitCode.Network })
    );
  });
});

function manifest(petSlugs: string[]) {
  return { collectionSlug: 'forest-friends', petSlugs, schemaVersion: 1 };
}
