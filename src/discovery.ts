import { createHash } from 'node:crypto';
import { CliError, ExitCode } from './errors.js';

export const DEFAULT_SITE_URL = 'https://codexpetdb.com';
export const DISCOVERY_PATH = '/.well-known/codexpetdb.json';
export const MAX_PACKAGE_BYTES = 25 * 1024 * 1024;

const REQUEST_TIMEOUT_MS = 30_000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const REVISION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export interface InstallMetadata {
  petId: string;
  revisionId: string;
  sha256: string;
  petVersion: 1 | 2;
  sizeBytes: number;
}

export interface InstallDownload {
  bytes: Uint8Array;
  metadata: InstallMetadata;
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
  assets: {
    origin: string;
  };
  catalogUrl: string;
  cli?: {
    binary: 'petdb';
    minVersion: string;
    packageName: 'petdb';
  };
  docsUrl: string;
  product: 'CodexPetDB';
  schemaVersion: 1;
  siteUrl: string;
}

export interface DiscoveredApi {
  apiBaseUrl: URL;
  assetOrigin: URL;
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

export function buildInstallUrl(apiBaseUrl: URL, petId: string): URL {
  const url = new URL(
    `${apiBaseUrl.pathname.replace(/\/$/, '')}/pets/${encodeURIComponent(petId)}/install`,
    apiBaseUrl.origin
  );
  url.searchParams.set('client', 'petdb');
  return url;
}

export async function discoverApi(
  siteUrl: string,
  options: Pick<DownloadOptions, 'clientVersion' | 'fetchImpl' | 'signal'> = {}
): Promise<DiscoveredApi> {
  const site = parseSiteUrl(siteUrl);
  const fetchImpl = options.fetchImpl ?? fetch;
  const discoveryUrl = new URL(DISCOVERY_PATH, site.origin);
  let response: Response;
  try {
    response = await fetchImpl(discoveryUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `petdb/${options.clientVersion ?? '1.0.0'}`,
      },
      redirect: 'error',
      signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new CliError(
      `Unable to discover CodexPetDB: ${errorMessage(error)}`,
      ExitCode.Network,
      { cause: error }
    );
  }
  if (!response.ok) {
    throw new CliError(
      `CodexPetDB discovery failed with HTTP ${response.status}.`,
      ExitCode.Network
    );
  }
  if (
    response.redirected ||
    (response.url !== '' && response.url !== discoveryUrl.href)
  ) {
    throw new CliError(
      'CodexPetDB discovery attempted an unsafe redirect.',
      ExitCode.Network
    );
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch (error) {
    throw new CliError(
      'CodexPetDB discovery returned invalid JSON.',
      ExitCode.Integrity,
      { cause: error }
    );
  }
  return validateDiscovery(value, site, options.clientVersion);
}

export async function downloadInstallPackage(
  petId: string,
  options: DownloadOptions = {}
): Promise<InstallDownload> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiBaseUrl =
    options.discoveredApi ??
    (await discoverApi(
      options.siteUrl ?? process.env.PETDB_SITE_URL ?? DEFAULT_SITE_URL,
      options
    ));
  const url = buildInstallUrl(apiBaseUrl.apiBaseUrl, petId);

  let metadataResponse: Response;
  try {
    metadataResponse = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `petdb/${options.clientVersion ?? '1.0.0'}`,
      },
      redirect: 'error',
      signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new CliError(
      `Unable to download pet '${petId}': ${errorMessage(error)}`,
      ExitCode.Network,
      { cause: error }
    );
  }

  if (!metadataResponse.ok) {
    throw new CliError(
      `Pet install metadata failed with HTTP ${metadataResponse.status}.`,
      ExitCode.Network
    );
  }
  if (
    metadataResponse.redirected ||
    (metadataResponse.url !== '' && metadataResponse.url !== url.href)
  ) {
    throw new CliError(
      'Pet install metadata attempted an unsafe redirect.',
      ExitCode.Network
    );
  }

  let metadataValue: unknown;
  try {
    metadataValue = await metadataResponse.json();
  } catch (error) {
    throw new CliError(
      'Pet install metadata returned invalid JSON.',
      ExitCode.Integrity,
      { cause: error }
    );
  }
  const { metadata, packageUrl } = readInstallMetadata(
    metadataValue,
    petId,
    apiBaseUrl.assetOrigin
  );

  let response: Response;
  try {
    response = await fetchImpl(packageUrl, {
      headers: {
        Accept: 'application/zip',
        'User-Agent': `petdb/${options.clientVersion ?? '1.0.0'}`,
      },
      redirect: 'error',
      signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new CliError(
      `Unable to download pet '${petId}': ${errorMessage(error)}`,
      ExitCode.Network,
      { cause: error }
    );
  }
  if (!response.ok) {
    throw new CliError(
      `Pet download failed with HTTP ${response.status}.`,
      ExitCode.Network
    );
  }
  if (
    response.redirected ||
    (response.url !== '' && response.url !== packageUrl.href)
  ) {
    throw new CliError(
      'Pet download attempted an unsafe redirect.',
      ExitCode.Network
    );
  }
  validatePackageHeaders(response.headers, metadata);
  if (!response.body) {
    throw new CliError(
      'Pet download returned an empty response body.',
      ExitCode.Integrity
    );
  }

  const bytes = await readBoundedBody(response.body, metadata.sizeBytes);
  const actualSha256 = createHash('sha256').update(bytes).digest('hex');
  if (actualSha256 !== metadata.sha256) {
    throw new CliError(
      'Downloaded package SHA-256 does not match the server metadata.',
      ExitCode.Integrity
    );
  }

  return { bytes, metadata };
}

function validateDiscovery(
  value: unknown,
  site: URL,
  clientVersion = '1.0.0'
): DiscoveredApi {
  if (!value || typeof value !== 'object') {
    throw invalidDiscovery();
  }
  const document = value as Partial<DiscoveryDocument>;
  const api = document.api;
  if (
    !hasExactKeys(document, [
      'api',
      'assets',
      'catalogUrl',
      'docsUrl',
      'product',
      'schemaVersion',
      'siteUrl',
      ...(document.cli === undefined ? [] : ['cli']),
    ]) ||
    document.schemaVersion !== 1 ||
    document.product !== 'CodexPetDB' ||
    typeof document.siteUrl !== 'string' ||
    typeof document.catalogUrl !== 'string' ||
    typeof document.docsUrl !== 'string' ||
    !isRecord(document.assets) ||
    !hasExactKeys(document.assets, ['origin']) ||
    typeof document.assets.origin !== 'string' ||
    !isRecord(api) ||
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

  const origin = site.origin;
  const declaredSite = exactUrl(document.siteUrl, `${origin}/`);
  const apiBase = exactUrl(api.baseUrl, `${origin}/api/v1/pub`);
  const assetOrigin = parseAssetOrigin(document.assets.origin, site);
  if (
    !declaredSite ||
    !apiBase ||
    !assetOrigin ||
    !parseOpenApiUrl(api.openApiUrl, site, assetOrigin) ||
    !exactUrl(document.catalogUrl, `${origin}/api/v1/pub/pet-catalog`) ||
    !exactUrl(document.docsUrl, `${origin}/en/docs`)
  ) {
    throw new CliError(
      'CodexPetDB discovery contains an unsafe API base URL.',
      ExitCode.Integrity
    );
  }

  if (document.cli !== undefined) {
    if (
      !isRecord(document.cli) ||
      !hasExactKeys(document.cli, ['binary', 'minVersion', 'packageName']) ||
      document.cli.binary !== 'petdb' ||
      document.cli.packageName !== 'petdb'
    ) {
      throw invalidDiscovery();
    }
    const minVersion = document.cli.minVersion;
    if (
      typeof minVersion !== 'string' ||
      !isSemver(minVersion) ||
      !isSemver(clientVersion)
    ) {
      throw invalidDiscovery();
    }
    if (compareSemver(clientVersion, minVersion) < 0) {
      throw new CliError(
        `CodexPetDB requires petdb ${minVersion} or newer.`,
        ExitCode.Integrity
      );
    }
  }
  return { apiBaseUrl: apiBase, assetOrigin };
}

function parseOpenApiUrl(
  value: string,
  site: URL,
  assetOrigin: URL
): URL | null {
  try {
    const parsed = new URL(value);
    if (
      parsed.hash !== '' ||
      parsed.username !== '' ||
      parsed.password !== ''
    ) {
      return null;
    }
    if (assetOrigin.origin !== site.origin) {
      return parsed.origin === assetOrigin.origin &&
        /^\/contracts\/public\/v\d+\.\d+\.\d+\/openapi\.json$/u.test(
          parsed.pathname
        ) &&
        parsed.search === ''
        ? parsed
        : null;
    }
    const keys = [...parsed.searchParams.keys()];
    const objectKey = parsed.searchParams.get('key');
    return parsed.origin === site.origin &&
      parsed.pathname === '/api/storage/file' &&
      keys.length === 1 &&
      keys[0] === 'key' &&
      objectKey !== null &&
      /^contracts\/public\/v\d+\.\d+\.\d+\/openapi\.json$/u.test(objectKey)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function invalidDiscovery(): CliError {
  return new CliError(
    'CodexPetDB discovery document has an unsupported shape.',
    ExitCode.Integrity
  );
}

function exactUrl(value: string, expected: string): URL | null {
  try {
    const parsed = new URL(value);
    return parsed.href === new URL(expected).href ? parsed : null;
  } catch {
    return null;
  }
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
  const normalized = hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1'
  );
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
    if (
      origin.protocol === 'http:' &&
      isLocalHostname(origin.hostname) &&
      origin.origin === site.origin
    ) {
      return origin;
    }
    return null;
  } catch {
    return null;
  }
}

function isSemver(value: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(value);
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

function readInstallMetadata(
  value: unknown,
  requestedPetId: string,
  assetOrigin: URL
): { metadata: InstallMetadata; packageUrl: URL } {
  if (!isRecord(value) || !isRecord(value.data)) throw invalidInstallMetadata();
  const data = value.data;
  const packageValue = data.package;
  if (
    !hasExactKeys(data, ['formatVersion', 'package', 'petId', 'revisionId']) ||
    !isRecord(packageValue) ||
    !hasExactKeys(packageValue, [
      'byteSize',
      'contentType',
      'filename',
      'sha256',
      'url',
    ])
  ) {
    throw invalidInstallMetadata();
  }
  const petId = data.petId;
  const revisionId = data.revisionId;
  const sha256 =
    typeof packageValue.sha256 === 'string'
      ? packageValue.sha256.toLowerCase()
      : '';
  const petVersionValue = data.formatVersion;
  const sizeBytes = packageValue.byteSize;

  if (typeof petId !== 'string' || petId !== requestedPetId) {
    throw new CliError(
      'Download metadata pet id does not match the requested pet.',
      ExitCode.Integrity
    );
  }
  if (typeof revisionId !== 'string' || !REVISION_ID_PATTERN.test(revisionId)) {
    throw new CliError(
      'Download metadata contains an invalid revision id.',
      ExitCode.Integrity
    );
  }
  if (!SHA256_PATTERN.test(sha256)) {
    throw new CliError(
      'Download metadata contains an invalid SHA-256.',
      ExitCode.Integrity
    );
  }
  if (petVersionValue !== 1 && petVersionValue !== 2) {
    throw new CliError(
      'Download metadata contains an unsupported pet version.',
      ExitCode.Integrity
    );
  }

  if (
    typeof sizeBytes !== 'number' ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0 ||
    sizeBytes > MAX_PACKAGE_BYTES
  ) {
    throw new CliError(
      `Pet package must be between 1 and ${MAX_PACKAGE_BYTES} bytes.`,
      ExitCode.Integrity
    );
  }

  if (
    packageValue.contentType !== 'application/zip' ||
    packageValue.filename !== `${petId}.zip` ||
    typeof packageValue.url !== 'string'
  ) {
    throw invalidInstallMetadata();
  }
  let packageUrl: URL;
  try {
    packageUrl = new URL(packageValue.url);
  } catch {
    throw invalidInstallMetadata();
  }
  if (
    packageUrl.origin !== assetOrigin.origin ||
    packageUrl.username !== '' ||
    packageUrl.password !== '' ||
    packageUrl.hash !== ''
  ) {
    throw new CliError(
      'Pet package URL uses an origin not allowed by discovery.',
      ExitCode.Integrity
    );
  }

  return {
    metadata: {
      petId,
      revisionId,
      sha256,
      petVersion: petVersionValue,
      sizeBytes,
    },
    packageUrl,
  };
}

function invalidInstallMetadata(): CliError {
  return new CliError(
    'Pet install metadata has an unsupported shape.',
    ExitCode.Integrity
  );
}

function validatePackageHeaders(
  headers: Headers,
  metadata: InstallMetadata
): void {
  const contentType = requiredHeader(headers, 'Content-Type').toLowerCase();
  const contentLength = Number(requiredHeader(headers, 'Content-Length'));
  if (contentType !== 'application/zip') {
    throw new CliError(
      'Pet package has an unexpected Content-Type.',
      ExitCode.Integrity
    );
  }
  if (contentLength !== metadata.sizeBytes) {
    throw new CliError(
      'Pet package Content-Length does not match install metadata.',
      ExitCode.Integrity
    );
  }
}

function requiredHeader(headers: Headers, name: string): string {
  const value = headers.get(name)?.trim();
  if (!value) {
    throw new CliError(
      `Download response is missing the ${name} header.`,
      ExitCode.Integrity
    );
  }
  return value;
}

async function readBoundedBody(
  body: ReadableStream<Uint8Array>,
  expectedBytes: number
): Promise<Uint8Array> {
  const reader = body.getReader();
  const result = new Uint8Array(expectedBytes);
  let offset = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (offset + value.byteLength > expectedBytes) {
        throw new CliError(
          'Downloaded package is larger than Content-Length.',
          ExitCode.Integrity
        );
      }
      result.set(value, offset);
      offset += value.byteLength;
    }
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      `Unable to read pet package: ${errorMessage(error)}`,
      ExitCode.Network,
      { cause: error }
    );
  } finally {
    reader.releaseLock();
  }

  if (offset !== expectedBytes) {
    throw new CliError(
      'Downloaded package size does not match Content-Length.',
      ExitCode.Integrity
    );
  }
  return result;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
