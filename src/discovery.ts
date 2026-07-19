import { createHash } from 'node:crypto';
import { CliError, ExitCode } from './errors.js';
import { isPublicId } from './pet-id.js';

export const DEFAULT_SITE_URL = 'https://codexpetdb.com';
export const DISCOVERY_PATH = '/.well-known/codexpetdb.json';
export const MAX_CATALOG_BYTES = 10 * 1024 * 1024;
export const MAX_PACKAGE_BYTES = 25 * 1024 * 1024;

const REQUEST_TIMEOUT_MS = 30_000;
const INSTALL_REPORT_TIMEOUT_MS = 2_000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const REVISION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const RFC3339_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

export interface CatalogPet {
  assets: {
    byteSize: CatalogAssetValues<number>;
    prefix: string;
    sha256: CatalogAssetValues<string>;
    spritesheetFile: 'spritesheet.png' | 'spritesheet.webp';
  };
  author: string;
  displayName: string;
  kind: 'character' | 'creature' | 'object';
  revision: { id: string; number: number };
  slug: string;
}

interface CatalogAssetValues<T> {
  manifest: T;
  package: T;
  poster: T;
  spritesheet: T;
}

export interface PublicPetCatalog {
  assetBase: string;
  generatedAt: string;
  pets: CatalogPet[];
  schemaVersion: 1;
  total: number;
}

export interface InstallDownload {
  bytes: Uint8Array;
  metadata: {
    petSlug: string;
    revisionId: string;
    revisionNumber: number;
    sha256: string;
    sizeBytes: number;
  };
}

export interface DownloadOptions {
  clientVersion?: string;
  discoveredApi?: DiscoveredApi;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  siteUrl?: string;
}

interface DiscoveryDocument {
  api: {
    baseUrl: string;
    currentVersion: 'v1';
    openApiUrl: string;
    supportedVersions: string[];
  };
  assets: { delivery: 'cdn' | 'proxy'; origin: string };
  catalogUrl: string;
  collectionCatalogUrl: string;
  cli?: { binary: 'petdb'; minVersion: string; packageName: 'petdb' };
  docsUrl: string;
  product: 'CodexPetDB';
  schemaVersion: 1;
  siteUrl: string;
}

export interface DiscoveredApi {
  apiBaseUrl: URL;
  assetDelivery: 'cdn' | 'proxy';
  assetOrigin: URL;
  catalogUrl: URL;
  collectionCatalogUrl: URL;
  siteUrl: URL;
}

export function parseSiteUrl(siteUrl: string): URL {
  let base: URL;
  try {
    base = new URL(siteUrl);
  } catch (error) {
    throw new CliError(
      'PETDB_SITE_URL must be a valid HTTP or HTTPS URL.',
      ExitCode.Usage,
      { cause: error }
    );
  }
  if (
    base.protocol !== 'https:' &&
    !(base.protocol === 'http:' && isLocalHostname(base.hostname))
  ) {
    throw new CliError(
      'PETDB_SITE_URL must use HTTPS, except for a local HTTP site.',
      ExitCode.Usage
    );
  }
  if (
    base.username !== '' ||
    base.password !== '' ||
    base.pathname !== '/' ||
    base.search !== '' ||
    base.hash !== ''
  ) {
    throw new CliError(
      'PETDB_SITE_URL must be a site origin without credentials, path, query, or hash.',
      ExitCode.Usage
    );
  }
  return base;
}

export async function discoverApi(
  siteUrl: string,
  options: Pick<DownloadOptions, 'clientVersion' | 'fetchImpl' | 'signal'> = {}
): Promise<DiscoveredApi> {
  const site = parseSiteUrl(siteUrl);
  const discoveryUrl = new URL(DISCOVERY_PATH, site);
  const response = await request(discoveryUrl, 'application/json', options);
  if (!response.ok) {
    throw new CliError(
      `CodexPetDB discovery failed with HTTP ${response.status}.`,
      ExitCode.Network
    );
  }
  assertNoRedirect(response, discoveryUrl, 'CodexPetDB discovery');
  return validateDiscovery(
    await readJson(response, 'CodexPetDB discovery'),
    site,
    options.clientVersion
  );
}

export async function downloadCatalog(
  options: DownloadOptions = {}
): Promise<{ catalog: PublicPetCatalog; discoveredApi: DiscoveredApi }> {
  const discoveredApi =
    options.discoveredApi ??
    (await discoverApi(
      options.siteUrl ?? process.env.PETDB_SITE_URL ?? DEFAULT_SITE_URL,
      options
    ));
  const response = await request(
    discoveredApi.catalogUrl,
    'application/json',
    options
  );
  if (!response.ok) {
    if (response.status === 404 || response.status === 410) {
      throw integrityError(
        'Pet catalog is unavailable. It may not be published yet or may be updating; retry later.'
      );
    }
    throw new CliError(
      `Pet catalog failed with HTTP ${response.status}.`,
      ExitCode.Network
    );
  }
  assertNoRedirect(response, discoveredApi.catalogUrl, 'Pet catalog');
  const contentType = response.headers.get('content-type')?.split(';', 1)[0];
  if (contentType !== 'application/json') {
    throw integrityError('Pet catalog has an unexpected Content-Type.');
  }
  if (!response.body) throw integrityError('Pet catalog response is empty.');
  const bytes = await readBoundedBody(
    response.body,
    MAX_CATALOG_BYTES,
    'Pet catalog'
  );
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    throw integrityError('Pet catalog returned invalid UTF-8 JSON.', error);
  }
  return { catalog: validateCatalog(value, discoveredApi), discoveredApi };
}

export function findCatalogPet(
  catalog: PublicPetCatalog,
  slug: string
): CatalogPet {
  const pet = catalog.pets.find((candidate) => candidate.slug === slug);
  if (!pet) {
    throw new CliError(`Unknown pet slug '${slug}'.`, ExitCode.Network);
  }
  return pet;
}

export async function downloadInstallPackage(
  pet: CatalogPet,
  options: DownloadOptions & { discoveredApi: DiscoveredApi }
): Promise<InstallDownload> {
  const packageUrl = assetUrl(
    options.discoveredApi,
    `${pet.assets.prefix}${pet.slug}.zip`
  );
  const response = await request(packageUrl, 'application/zip', options);
  if (!response.ok) {
    throw new CliError(
      `Pet download failed with HTTP ${response.status}.`,
      ExitCode.Network
    );
  }
  assertNoRedirect(response, packageUrl, 'Pet download');
  const contentType = response.headers.get('content-type')?.split(';', 1)[0];
  if (contentType !== 'application/zip') {
    throw integrityError('Pet package has an unexpected Content-Type.');
  }
  const expectedBytes = pet.assets.byteSize.package;
  if (expectedBytes > MAX_PACKAGE_BYTES) {
    throw integrityError(`Pet package exceeds ${MAX_PACKAGE_BYTES} bytes.`);
  }
  if (!response.body) throw integrityError('Pet package response is empty.');
  const bytes = await readExactBody(
    response.body,
    expectedBytes,
    'Pet package'
  );
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== pet.assets.sha256.package) {
    throw integrityError(
      'Downloaded package SHA-256 does not match the catalog.'
    );
  }
  return {
    bytes,
    metadata: {
      petSlug: pet.slug,
      revisionId: pet.revision.id,
      revisionNumber: pet.revision.number,
      sha256,
      sizeBytes: expectedBytes,
    },
  };
}

export async function reportInstall(
  slug: string,
  discoveredApi: DiscoveredApi,
  options: Pick<DownloadOptions, 'clientVersion' | 'fetchImpl'> = {}
): Promise<boolean> {
  const url = new URL(
    `${discoveredApi.apiBaseUrl.pathname.replace(/\/$/u, '')}/pets/${encodeURIComponent(slug)}/installs`,
    discoveredApi.apiBaseUrl.origin
  );
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      headers: { 'User-Agent': userAgent(options.clientVersion) },
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(INSTALL_REPORT_TIMEOUT_MS),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}

function validateDiscovery(
  value: unknown,
  site: URL,
  clientVersion = '1.0.0'
): DiscoveredApi {
  if (!isRecord(value)) throw invalidDiscovery();
  const document = value as Partial<DiscoveryDocument>;
  if (
    !hasExactKeys(value, [
      'api',
      'assets',
      'catalogUrl',
      'collectionCatalogUrl',
      ...(document.cli === undefined ? [] : ['cli']),
      'docsUrl',
      'product',
      'schemaVersion',
      'siteUrl',
    ]) ||
    document.schemaVersion !== 1 ||
    document.product !== 'CodexPetDB' ||
    !isRecord(document.api) ||
    !isRecord(document.assets) ||
    !hasExactKeys(document.assets, ['delivery', 'origin']) ||
    (document.assets.delivery !== 'cdn' &&
      document.assets.delivery !== 'proxy') ||
    typeof document.assets.origin !== 'string' ||
    typeof document.catalogUrl !== 'string' ||
    typeof document.collectionCatalogUrl !== 'string' ||
    typeof document.docsUrl !== 'string' ||
    typeof document.siteUrl !== 'string'
  ) {
    throw invalidDiscovery();
  }
  const api = document.api;
  if (
    !hasExactKeys(api, [
      'baseUrl',
      'currentVersion',
      'openApiUrl',
      'supportedVersions',
    ]) ||
    api.currentVersion !== 'v1' ||
    !Array.isArray(api.supportedVersions) ||
    api.supportedVersions.length !== 1 ||
    api.supportedVersions[0] !== 'v1' ||
    typeof api.baseUrl !== 'string' ||
    typeof api.openApiUrl !== 'string'
  ) {
    throw invalidDiscovery();
  }
  const declaredSite = exactUrl(document.siteUrl, site.href);
  const apiBaseUrl = exactUrl(api.baseUrl, `${site.origin}/api/v1/pub`);
  const assetOrigin = parseAssetOrigin(document.assets.origin, site);
  const catalogUrl = parseCatalogUrl(
    document.catalogUrl,
    site,
    assetOrigin,
    document.assets.delivery
  );
  const collectionCatalogUrl = parseCollectionCatalogUrl(
    document.collectionCatalogUrl,
    site,
    assetOrigin,
    document.assets.delivery
  );
  if (
    !declaredSite ||
    !apiBaseUrl ||
    !assetOrigin ||
    !catalogUrl ||
    !collectionCatalogUrl ||
    !parseOpenApiUrl(api.openApiUrl, site, assetOrigin) ||
    !exactUrl(document.docsUrl, `${site.origin}/en/docs`)
  ) {
    throw invalidDiscovery();
  }
  validateCli(document.cli, clientVersion);
  return {
    apiBaseUrl,
    assetDelivery: document.assets.delivery,
    assetOrigin,
    catalogUrl,
    collectionCatalogUrl,
    siteUrl: declaredSite,
  };
}

function validateCatalog(
  value: unknown,
  discoveredApi: DiscoveredApi
): PublicPetCatalog {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'assetBase',
      'generatedAt',
      'pets',
      'schemaVersion',
      'total',
    ]) ||
    value.schemaVersion !== 1 ||
    typeof value.assetBase !== 'string' ||
    !exactUrl(value.assetBase, `${discoveredApi.assetOrigin.origin}/`) ||
    typeof value.generatedAt !== 'string' ||
    !RFC3339_DATE_TIME_PATTERN.test(value.generatedAt) ||
    !Number.isFinite(Date.parse(value.generatedAt)) ||
    typeof value.total !== 'number' ||
    !Number.isSafeInteger(value.total) ||
    !Array.isArray(value.pets) ||
    value.total !== value.pets.length
  ) {
    throw invalidCatalog();
  }
  const pets = value.pets.map(validateCatalogPet);
  for (let index = 0; index < pets.length; index += 1) {
    if (
      index > 0 &&
      (pets[index - 1] as CatalogPet).slug >= (pets[index] as CatalogPet).slug
    ) {
      throw invalidCatalog();
    }
  }
  return { ...value, pets } as PublicPetCatalog;
}

function validateCatalogPet(value: unknown): CatalogPet {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'assets',
      'author',
      'displayName',
      'kind',
      'revision',
      'slug',
    ]) ||
    typeof value.slug !== 'string' ||
    !isPublicId(value.slug) ||
    typeof value.displayName !== 'string' ||
    value.displayName.length === 0 ||
    typeof value.author !== 'string' ||
    !['character', 'creature', 'object'].includes(String(value.kind)) ||
    !isRecord(value.revision) ||
    !hasExactKeys(value.revision, ['id', 'number']) ||
    typeof value.revision.id !== 'string' ||
    !REVISION_ID_PATTERN.test(value.revision.id) ||
    typeof value.revision.number !== 'number' ||
    !Number.isSafeInteger(value.revision.number) ||
    value.revision.number <= 0 ||
    !isRecord(value.assets) ||
    !hasExactKeys(value.assets, [
      'byteSize',
      'prefix',
      'sha256',
      'spritesheetFile',
    ]) ||
    value.assets.prefix !== `revisions/${value.revision.id}/` ||
    (value.assets.spritesheetFile !== 'spritesheet.png' &&
      value.assets.spritesheetFile !== 'spritesheet.webp') ||
    !validAssetValues(
      value.assets.byteSize,
      (item) =>
        typeof item === 'number' && Number.isSafeInteger(item) && item > 0
    ) ||
    !validAssetValues(
      value.assets.sha256,
      (item) => typeof item === 'string' && SHA256_PATTERN.test(item)
    )
  ) {
    throw invalidCatalog();
  }
  return value as unknown as CatalogPet;
}

function validAssetValues(
  value: unknown,
  predicate: (item: unknown) => boolean
): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['manifest', 'package', 'poster', 'spritesheet']) &&
    Object.values(value).every(predicate)
  );
}

function assetUrl(discovered: DiscoveredApi, key: string): URL {
  if (
    !/^revisions\/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[A-Za-z0-9._~*-]+\.zip$/u.test(
      key
    )
  ) {
    throw integrityError('Catalog package key is invalid.');
  }
  if (discovered.assetDelivery === 'cdn') {
    return new URL(key, discovered.assetOrigin);
  }
  const url = new URL('/api/storage/file', discovered.siteUrl);
  url.searchParams.set('key', key);
  return url;
}

async function request(
  url: URL,
  accept: string,
  options: Pick<DownloadOptions, 'clientVersion' | 'fetchImpl' | 'signal'>
): Promise<Response> {
  try {
    return await (options.fetchImpl ?? fetch)(url, {
      headers: {
        Accept: accept,
        'User-Agent': userAgent(options.clientVersion),
      },
      redirect: 'error',
      signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new CliError(
      `Request failed: ${errorMessage(error)}`,
      ExitCode.Network,
      {
        cause: error,
      }
    );
  }
}

function assertNoRedirect(
  response: Response,
  expected: URL,
  label: string
): void {
  if (
    response.redirected ||
    (response.url !== '' && response.url !== expected.href)
  ) {
    throw new CliError(
      `${label} attempted an unsafe redirect.`,
      ExitCode.Network
    );
  }
}

async function readJson(response: Response, label: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw integrityError(`${label} returned invalid JSON.`, error);
  }
}

async function readExactBody(
  body: ReadableStream<Uint8Array>,
  expected: number,
  label: string
): Promise<Uint8Array> {
  const bytes = await readBoundedBody(body, expected, label);
  if (bytes.byteLength !== expected) {
    throw integrityError(`${label} size does not match the catalog.`);
  }
  return bytes;
}

async function readBoundedBody(
  body: ReadableStream<Uint8Array>,
  maximum: number,
  label: string
): Promise<Uint8Array> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximum)
        throw integrityError(`${label} exceeds its size limit.`);
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

function parseCatalogUrl(
  value: string,
  site: URL,
  assetOrigin: URL | null,
  delivery: 'cdn' | 'proxy'
): URL | null {
  if (!assetOrigin) return null;
  if (delivery === 'cdn') {
    return exactUrl(value, `${assetOrigin.origin}/catalogs/v1/pets.json`);
  }
  return exactStorageUrl(value, site, 'catalogs/v1/pets.json');
}

function parseCollectionCatalogUrl(
  value: string,
  site: URL,
  assetOrigin: URL | null,
  delivery: 'cdn' | 'proxy'
): URL | null {
  if (!assetOrigin) return null;
  if (delivery === 'cdn') {
    return exactUrl(
      value,
      `${assetOrigin.origin}/catalogs/v1/collections.json`
    );
  }
  return exactStorageUrl(value, site, 'catalogs/v1/collections.json');
}

function parseOpenApiUrl(
  value: string,
  site: URL,
  assetOrigin: URL
): URL | null {
  try {
    const parsed = new URL(value);
    if (
      parsed.origin === assetOrigin.origin &&
      /^\/contracts\/public\/v\d+\.\d+\.\d+\/openapi\.json$/u.test(
        parsed.pathname
      ) &&
      parsed.search === ''
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return exactStorageUrlFromPattern(
    value,
    site,
    /^contracts\/public\/v\d+\.\d+\.\d+\/openapi\.json$/u
  );
}

function exactStorageUrl(value: string, site: URL, key: string): URL | null {
  return exactStorageUrlFromPattern(
    value,
    site,
    new RegExp(`^${escapeRegex(key)}$`, 'u')
  );
}

function exactStorageUrlFromPattern(
  value: string,
  site: URL,
  keyPattern: RegExp
): URL | null {
  try {
    const parsed = new URL(value);
    const keys = [...parsed.searchParams.keys()];
    const key = parsed.searchParams.get('key');
    return parsed.origin === site.origin &&
      parsed.pathname === '/api/storage/file' &&
      keys.length === 1 &&
      keys[0] === 'key' &&
      key !== null &&
      keyPattern.test(key)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function parseAssetOrigin(value: string, site: URL): URL | null {
  try {
    const origin = new URL(value);
    if (
      origin.username !== '' ||
      origin.password !== '' ||
      origin.pathname !== '/' ||
      origin.search !== '' ||
      origin.hash !== ''
    ) {
      return null;
    }
    if (origin.protocol === 'https:') return origin;
    return origin.protocol === 'http:' &&
      isLocalHostname(origin.hostname) &&
      origin.origin === site.origin
      ? origin
      : null;
  } catch {
    return null;
  }
}

function validateCli(value: unknown, clientVersion: string): void {
  if (value === undefined) return;
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['binary', 'minVersion', 'packageName']) ||
    value.binary !== 'petdb' ||
    value.packageName !== 'petdb' ||
    typeof value.minVersion !== 'string' ||
    !isSemver(value.minVersion) ||
    !isSemver(clientVersion)
  ) {
    throw invalidDiscovery();
  }
  if (compareSemver(clientVersion, value.minVersion) < 0) {
    throw integrityError(
      `CodexPetDB requires petdb ${value.minVersion} or newer.`
    );
  }
}

function exactUrl(value: string, expected: string): URL | null {
  try {
    const parsed = new URL(value);
    return parsed.href === new URL(expected).href ? parsed : null;
  } catch {
    return null;
  }
}

function invalidDiscovery(): CliError {
  return integrityError(
    'CodexPetDB discovery document has an unsupported shape.'
  );
}

function invalidCatalog(): CliError {
  return integrityError('Pet catalog has an unsupported shape.');
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

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/gu, '').replace(/\.$/u, '');
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1'
  );
}

function isSemver(value: string): boolean {
  return /^\d+\.\d+\.\d+$/u.test(value);
}

function compareSemver(left: string, right: string): number {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function userAgent(version = '1.0.0'): string {
  return `petdb/${version}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
