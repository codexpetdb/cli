import {
  DEFAULT_SITE_URL,
  type DiscoveredApi,
  type DownloadOptions,
  discoverApi,
} from './discovery.js';
import { CliError, ExitCode } from './errors.js';
import { isPublicId } from './pet-id.js';

export const MAX_COLLECTION_PETS = 100;

const REQUEST_TIMEOUT_MS = 30_000;

export interface CollectionInstallManifest {
  collectionSlug: string;
  petSlugs: string[];
}

export function buildCollectionManifestUrl(
  apiBaseUrl: URL,
  collectionId: string
): URL {
  return new URL(
    `${apiBaseUrl.pathname.replace(/\/$/, '')}/collections/${encodeURIComponent(collectionId)}/manifest`,
    apiBaseUrl.origin
  );
}

export async function downloadCollectionManifest(
  collectionId: string,
  options: DownloadOptions = {}
): Promise<CollectionInstallManifest> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const discoveredApi =
    options.discoveredApi ??
    (await discoverApi(
      options.siteUrl ?? process.env.PETDB_SITE_URL ?? DEFAULT_SITE_URL,
      options
    ));
  const url = buildCollectionManifestUrl(
    discoveredApi.apiBaseUrl,
    collectionId
  );
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `petdb/${options.clientVersion ?? '1.0.0'}`,
      },
      redirect: 'error',
      signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new CliError(
      `Unable to download collection '${collectionId}': ${errorMessage(error)}`,
      ExitCode.Network,
      { cause: error }
    );
  }
  if (!response.ok) {
    throw new CliError(
      `Collection manifest failed with HTTP ${response.status}.`,
      ExitCode.Network
    );
  }
  if (
    response.redirected ||
    (response.url !== '' && response.url !== url.href)
  ) {
    throw new CliError(
      'Collection manifest attempted an unsafe redirect.',
      ExitCode.Network
    );
  }
  const contentType = response.headers.get('content-type')?.split(';', 1)[0];
  if (contentType !== 'application/json') {
    throw new CliError(
      'Collection manifest has an unexpected Content-Type.',
      ExitCode.Integrity
    );
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch (error) {
    throw new CliError(
      'Collection manifest returned invalid JSON.',
      ExitCode.Integrity,
      { cause: error }
    );
  }
  return validateCollectionManifest(value, collectionId, discoveredApi);
}

export function validateCollectionManifest(
  value: unknown,
  requestedCollectionId: string,
  _discoveredApi: DiscoveredApi
): CollectionInstallManifest {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['collectionSlug', 'petSlugs', 'schemaVersion']) ||
    value.schemaVersion !== 1 ||
    value.collectionSlug !== requestedCollectionId ||
    !Array.isArray(value.petSlugs) ||
    value.petSlugs.length > MAX_COLLECTION_PETS
  ) {
    throw invalidManifest();
  }

  const petSlugs: string[] = [];
  const seen = new Set<string>();
  for (const slug of value.petSlugs) {
    if (typeof slug !== 'string' || !isPublicId(slug)) {
      throw invalidManifest();
    }
    if (seen.has(slug)) {
      throw new CliError(
        `Collection manifest contains duplicate pet slug '${slug}'.`,
        ExitCode.Integrity
      );
    }
    seen.add(slug);
    petSlugs.push(slug);
  }

  return {
    collectionSlug: value.collectionSlug,
    petSlugs,
  };
}

function invalidManifest(): CliError {
  return new CliError(
    'Collection manifest has an unsupported shape.',
    ExitCode.Integrity
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: object, expectedKeys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
