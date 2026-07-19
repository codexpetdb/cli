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
  collectionId: string;
  collectionSlug?: string;
  petIds: string[];
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
  discoveredApi: DiscoveredApi
): CollectionInstallManifest {
  if (
    !isRecord(value) ||
    (!hasExactKeys(value, ['collectionId', 'pets', 'schemaVersion']) &&
      !hasExactKeys(value, [
        'collectionId',
        'collectionSlug',
        'pets',
        'schemaVersion',
      ])) ||
    value.schemaVersion !== 1 ||
    typeof value.collectionId !== 'string' ||
    !isPublicId(value.collectionId) ||
    (value.collectionSlug === undefined
      ? value.collectionId !== requestedCollectionId
      : value.collectionSlug !== requestedCollectionId) ||
    !Array.isArray(value.pets) ||
    value.pets.length > MAX_COLLECTION_PETS
  ) {
    throw invalidManifest();
  }

  const petIds: string[] = [];
  const seen = new Set<string>();
  for (const pet of value.pets) {
    if (
      !isRecord(pet) ||
      !hasExactKeys(pet, ['id', 'package']) ||
      typeof pet.id !== 'string' ||
      !isPublicId(pet.id) ||
      typeof pet.package !== 'string'
    ) {
      throw invalidManifest();
    }
    if (seen.has(pet.id)) {
      throw new CliError(
        `Collection manifest contains duplicate pet id '${pet.id}'.`,
        ExitCode.Integrity
      );
    }
    validatePackageUrl(pet.package, discoveredApi.assetOrigin);
    seen.add(pet.id);
    petIds.push(pet.id);
  }

  return {
    collectionId: value.collectionId,
    ...(typeof value.collectionSlug === 'string'
      ? { collectionSlug: value.collectionSlug }
      : {}),
    petIds,
  };
}

function validatePackageUrl(value: string, assetOrigin: URL): void {
  let packageUrl: URL;
  try {
    packageUrl = new URL(value);
  } catch {
    throw invalidManifest();
  }
  if (
    packageUrl.origin !== assetOrigin.origin ||
    packageUrl.username !== '' ||
    packageUrl.password !== '' ||
    packageUrl.hash !== ''
  ) {
    throw new CliError(
      'Collection manifest package URL uses an origin not allowed by discovery.',
      ExitCode.Integrity
    );
  }
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
