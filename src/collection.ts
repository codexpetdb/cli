import {
  DEFAULT_SITE_URL,
  type DiscoveredApi,
  type DownloadOptions,
  discoverApi,
} from './discovery.js';
import { captureHttpDebug, CliError, ExitCode } from './errors.js';
import { isCollectionId, isPublicId } from './pet-id.js';

export const MAX_COLLECTION_PETS = 100;
export const MAX_COLLECTION_CATALOG_BYTES = 10 * 1024 * 1024;

const REQUEST_TIMEOUT_MS = 30_000;
const RFC3339_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

export interface CatalogCollection {
  name: string;
  petSlugs: string[];
  slug: string;
}

export interface PublicCollectionCatalog {
  collections: CatalogCollection[];
  generatedAt: string;
  schemaVersion: 1;
  total: number;
}

export async function downloadCollectionCatalog(
  options: DownloadOptions = {}
): Promise<{
  catalog: PublicCollectionCatalog;
  discoveredApi: DiscoveredApi;
}> {
  const discoveredApi =
    options.discoveredApi ??
    (await discoverApi(
      options.siteUrl ?? process.env.PETDB_SITE_URL ?? DEFAULT_SITE_URL,
      options
    ));
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(
      discoveredApi.collectionCatalogUrl,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': `petdb/${options.clientVersion ?? '1.0.0'}`,
        },
        redirect: 'error',
        signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
  } catch (error) {
    throw new CliError(
      `Unable to download Collection catalog: ${errorMessage(error)}`,
      ExitCode.Network,
      { cause: error }
    );
  }
  if (!response.ok) {
    const http = await captureHttpDebug(response);
    if (response.status === 404 || response.status === 410) {
      throw new CliError(
        'Collection catalog is unavailable. It may not be published yet or may be updating; retry later.',
        ExitCode.Integrity,
        { http }
      );
    }
    throw new CliError(
      `Collection catalog failed with HTTP ${response.status}.`,
      ExitCode.Network,
      { http }
    );
  }
  if (
    response.redirected ||
    (response.url !== '' &&
      response.url !== discoveredApi.collectionCatalogUrl.href)
  ) {
    throw new CliError(
      'Collection catalog attempted an unsafe redirect.',
      ExitCode.Network
    );
  }
  const contentType = response.headers.get('content-type')?.split(';', 1)[0];
  if (contentType !== 'application/json') {
    throw integrityError('Collection catalog has an unexpected Content-Type.');
  }
  if (!response.body) {
    throw integrityError('Collection catalog response is empty.');
  }
  const bytes = await readBoundedBody(
    response.body,
    MAX_COLLECTION_CATALOG_BYTES
  );
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    throw integrityError(
      'Collection catalog returned invalid UTF-8 JSON.',
      error
    );
  }
  return { catalog: validateCollectionCatalog(value), discoveredApi };
}

export function validateCollectionCatalog(
  value: unknown
): PublicCollectionCatalog {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'collections',
      'generatedAt',
      'schemaVersion',
      'total',
    ]) ||
    value.schemaVersion !== 1 ||
    typeof value.generatedAt !== 'string' ||
    !RFC3339_DATE_TIME_PATTERN.test(value.generatedAt) ||
    !Number.isFinite(Date.parse(value.generatedAt)) ||
    typeof value.total !== 'number' ||
    !Number.isSafeInteger(value.total) ||
    !Array.isArray(value.collections) ||
    value.total !== value.collections.length
  ) {
    throw invalidCatalog();
  }
  const collections = value.collections.map(validateCatalogCollection);
  for (let index = 1; index < collections.length; index += 1) {
    if (collections[index - 1].slug >= collections[index].slug) {
      throw invalidCatalog();
    }
  }
  return { ...value, collections } as PublicCollectionCatalog;
}

export function findCatalogCollection(
  catalog: PublicCollectionCatalog,
  slug: string
): CatalogCollection {
  const collection = catalog.collections.find(
    (candidate) => candidate.slug === slug
  );
  if (!collection) {
    throw integrityError(`Collection '${slug}' is missing from the catalog.`);
  }
  if (collection.petSlugs.length === 0) {
    throw integrityError(
      `Collection '${slug}' has no installable public pets.`
    );
  }
  return collection;
}

function validateCatalogCollection(value: unknown): CatalogCollection {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['name', 'petSlugs', 'slug']) ||
    typeof value.name !== 'string' ||
    value.name.length === 0 ||
    typeof value.slug !== 'string' ||
    !isCollectionId(value.slug) ||
    !Array.isArray(value.petSlugs) ||
    value.petSlugs.length > MAX_COLLECTION_PETS
  ) {
    throw invalidCatalog();
  }
  const seen = new Set<string>();
  for (const petSlug of value.petSlugs) {
    if (
      typeof petSlug !== 'string' ||
      !isPublicId(petSlug) ||
      seen.has(petSlug)
    ) {
      throw invalidCatalog();
    }
    seen.add(petSlug);
  }
  return value as unknown as CatalogCollection;
}

async function readBoundedBody(
  body: ReadableStream<Uint8Array>,
  maximum: number
): Promise<Uint8Array> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximum) {
        throw integrityError('Collection catalog exceeds its size limit.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function invalidCatalog(): CliError {
  return integrityError('Collection catalog has an unsupported shape.');
}

function integrityError(message: string, cause?: unknown): CliError {
  return new CliError(message, ExitCode.Integrity, { cause });
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
