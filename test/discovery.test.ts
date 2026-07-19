import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  buildInstallUrl,
  discoverApi,
  downloadInstallPackage,
  MAX_PACKAGE_BYTES,
} from '../src/discovery.js';
import { type CliError, ExitCode, type ExitCodeValue } from '../src/errors.js';

describe('install discovery', () => {
  it('builds the fixed v1 install metadata endpoint', () => {
    expect(
      buildInstallUrl(new URL('https://pets.example/api/v1/pub'), 'sleepy-fox')
        .href
    ).toBe(
      'https://pets.example/api/v1/pub/pets/sleepy-fox/install?client=petdb'
    );
  });

  it('downloads from the discovered asset origin after reading metadata', async () => {
    const bytes = new TextEncoder().encode('package');
    const fetchImpl = sequentialFetch(
      metadataResponse(bytes),
      packageResponse(bytes)
    );

    await expect(
      downloadInstallPackage('sleepy-fox', {
        fetchImpl: fetchImpl as typeof fetch,
        siteUrl: 'https://pets.example',
      })
    ).resolves.toEqual({
      bytes,
      metadata: {
        petId: 'sleepy-fox',
        petVersion: 2,
        revisionId: 'rev_123',
        sha256: sha256(bytes),
        sizeBytes: bytes.byteLength,
      },
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      new URL('https://cdn.pets.example/packages/sleepy-fox.zip'),
      expect.objectContaining({ redirect: 'error' })
    );
  });

  it('rejects an asset URL outside the discovery allowlist', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const fetchImpl = sequentialFetch(
      metadataResponse(bytes, { url: 'https://evil.example/pet.zip' }),
      packageResponse(bytes)
    );
    await expectFailure(
      downloadInstallPackage('sleepy-fox', {
        fetchImpl: fetchImpl as typeof fetch,
        siteUrl: 'https://pets.example',
      }),
      ExitCode.Integrity
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('rejects redirects from both metadata and package requests', async () => {
    const bytes = new Uint8Array([1]);
    const redirectedMetadata = metadataResponse(bytes);
    Object.defineProperty(redirectedMetadata, 'redirected', { value: true });
    await expectFailure(
      downloadInstallPackage('sleepy-fox', {
        fetchImpl: sequentialFetch(redirectedMetadata) as typeof fetch,
        siteUrl: 'https://pets.example',
      }),
      ExitCode.Network
    );

    const redirectedPackage = packageResponse(bytes);
    Object.defineProperty(redirectedPackage, 'redirected', { value: true });
    await expectFailure(
      downloadInstallPackage('sleepy-fox', {
        fetchImpl: sequentialFetch(
          metadataResponse(bytes),
          redirectedPackage
        ) as typeof fetch,
        siteUrl: 'https://pets.example',
      }),
      ExitCode.Network
    );
  });

  it('rejects empty, oversized, length-mismatched, and hash-mismatched packages', async () => {
    const cases = [
      {
        metadata: metadataResponse(new Uint8Array(), { sizeBytes: 0 }),
        package: packageResponse(new Uint8Array()),
      },
      {
        metadata: metadataResponse(new Uint8Array([1]), {
          sizeBytes: MAX_PACKAGE_BYTES + 1,
        }),
        package: packageResponse(new Uint8Array([1])),
      },
      {
        metadata: metadataResponse(new Uint8Array([1, 2, 3])),
        package: packageResponse(new Uint8Array([1, 2, 3]), { sizeBytes: 2 }),
      },
      {
        metadata: metadataResponse(new Uint8Array([1, 2, 3]), {
          sha256: '0'.repeat(64),
        }),
        package: packageResponse(new Uint8Array([1, 2, 3])),
      },
    ];
    for (const fixture of cases) {
      await expectFailure(
        downloadInstallPackage('sleepy-fox', {
          fetchImpl: sequentialFetch(
            fixture.metadata,
            fixture.package
          ) as typeof fetch,
          siteUrl: 'https://pets.example',
        }),
        ExitCode.Integrity
      );
    }
  });

  it('rejects an unexpected package content type', async () => {
    const bytes = new Uint8Array([1]);
    await expectFailure(
      downloadInstallPackage('sleepy-fox', {
        fetchImpl: sequentialFetch(
          metadataResponse(bytes),
          packageResponse(bytes, { contentType: 'text/html' })
        ) as typeof fetch,
        siteUrl: 'https://pets.example',
      }),
      ExitCode.Integrity
    );
  });

  it('rejects unsafe API and asset origins in discovery', async () => {
    const invalidDocuments = [
      discovery({
        api: {
          ...discovery().api,
          baseUrl: 'https://evil.example/api/v1/pub',
        },
      }),
      discovery({ assets: { origin: 'http://cdn.pets.example' } }),
      discovery({ assets: { origin: 'https://cdn.pets.example/path' } }),
      discovery({ assets: { origin: '//cdn.pets.example' } }),
      discovery({ assets: { origin: 'https://user@cdn.pets.example' } }),
      discovery({
        api: {
          ...discovery().api,
          openApiUrl:
            'https://evil.example/contracts/public/v1.0.0/openapi.json',
        },
      }),
    ];
    for (const document of invalidDocuments) {
      await expectFailure(
        discoverApi('https://pets.example', {
          fetchImpl: vi.fn(async () =>
            discoveryResponse(document)
          ) as typeof fetch,
        }),
        ExitCode.Integrity
      );
    }
  });

  it('accepts exact local discovery with same-origin local assets', async () => {
    const document = discovery({
      api: {
        ...discovery().api,
        baseUrl: 'http://localhost:3000/api/v1/pub',
        openApiUrl:
          'http://localhost:3000/api/storage/file?key=contracts%2Fpublic%2Fv1.0.0%2Fopenapi.json',
      },
      assets: { origin: 'http://localhost:3000' },
      catalogUrl: 'http://localhost:3000/api/v1/pub/pet-catalog',
      docsUrl: 'http://localhost:3000/en/docs',
      siteUrl: 'http://localhost:3000',
    });
    await expect(
      discoverApi('http://localhost:3000', {
        fetchImpl: vi.fn(async () =>
          discoveryResponse(document)
        ) as typeof fetch,
      })
    ).resolves.toEqual({
      apiBaseUrl: new URL('http://localhost:3000/api/v1/pub'),
      assetOrigin: new URL('http://localhost:3000'),
    });
  });

  it('enforces the exact discovery identity and CLI version', async () => {
    for (const document of [
      discovery({ product: 'codexpetdb' }),
      discovery({ schemaVersion: 2 }),
      discovery({ unexpected: true }),
      discovery({
        cli: { binary: 'petdb', minVersion: '2.0.0', packageName: 'petdb' },
      }),
    ]) {
      await expectFailure(
        discoverApi('https://pets.example', {
          clientVersion: '1.0.0',
          fetchImpl: vi.fn(async () =>
            discoveryResponse(document)
          ) as typeof fetch,
        }),
        ExitCode.Integrity
      );
    }
  });
});

function sequentialFetch(metadata: Response, packageResult?: Response) {
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(discoveryResponse())
    .mockResolvedValueOnce(metadata);
  if (packageResult) fetchImpl.mockResolvedValueOnce(packageResult);
  return fetchImpl;
}

function discovery(overrides: Record<string, unknown> = {}) {
  return {
    api: {
      baseUrl: 'https://pets.example/api/v1/pub',
      currentVersion: 'v1',
      openApiUrl:
        'https://cdn.pets.example/contracts/public/v1.0.0/openapi.json',
      supportedVersions: ['v1'],
    },
    assets: { origin: 'https://cdn.pets.example' },
    catalogUrl: 'https://pets.example/api/v1/pub/pet-catalog',
    cli: { binary: 'petdb', minVersion: '1.0.0', packageName: 'petdb' },
    docsUrl: 'https://pets.example/en/docs',
    product: 'CodexPetDB',
    schemaVersion: 1,
    siteUrl: 'https://pets.example',
    ...overrides,
  };
}

function discoveryResponse(value = discovery()): Response {
  return Response.json(value);
}

function metadataResponse(
  bytes: Uint8Array,
  overrides: {
    sha256?: string;
    sizeBytes?: number;
    url?: string;
  } = {}
): Response {
  return Response.json({
    data: {
      formatVersion: 2,
      package: {
        byteSize: overrides.sizeBytes ?? bytes.byteLength,
        contentType: 'application/zip',
        filename: 'sleepy-fox.zip',
        sha256: overrides.sha256 ?? sha256(bytes),
        url:
          overrides.url ?? 'https://cdn.pets.example/packages/sleepy-fox.zip',
      },
      petId: 'sleepy-fox',
      revisionId: 'rev_123',
    },
    meta: {},
  });
}

function packageResponse(
  bytes: Uint8Array,
  overrides: { contentType?: string; sizeBytes?: number } = {}
): Response {
  return new Response(bytes.slice().buffer as ArrayBuffer, {
    headers: {
      'Content-Length': String(overrides.sizeBytes ?? bytes.byteLength),
      'Content-Type': overrides.contentType ?? 'application/zip',
    },
  });
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function expectFailure(
  promise: Promise<unknown>,
  exitCode: ExitCodeValue
): Promise<void> {
  await expect(promise).rejects.toEqual(
    expect.objectContaining<Partial<CliError>>({ exitCode })
  );
}
