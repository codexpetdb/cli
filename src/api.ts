import {
  abortCliPetUpload,
  type ApiProblem,
  type CliCurrentUserResponse,
  type CliDeviceCodeResponse,
  type CliDeviceError,
  type CliDeviceTokenResponse,
  type CliEditSourceResponse,
  type CliFinalizeResponse,
  type CliPetRevisionRequest,
  type CliPetSubmissionRequest,
  type CliUploadSessionResponse,
  type CliUploadTarget,
  createCliDeviceCode,
  createCliPetRevision,
  createCliPetSubmission,
  finalizeCliPetUpload,
  getCliCurrentUser,
  getCliPetEditSource,
  pollCliDeviceToken,
  revokeCliCurrentSession,
} from './generated/cli-api/index.js';
import { createClient } from './generated/cli-api/client/index.js';
import { normalizeSiteOrigin } from './credentials.js';
import {
  captureHttpDebug,
  CliError,
  createHttpDebugInfo,
  ExitCode,
} from './errors.js';
import { CLI_VERSION } from './version.js';

const REQUEST_TIMEOUT_MS = 30_000;

export type CurrentUser = CliCurrentUserResponse['data'];
export type DeviceCode = CliDeviceCodeResponse;
export type EditSource = CliEditSourceResponse['data'];
export type FinalizedUpload = CliFinalizeResponse['data'];
export type PetRevisionInput = CliPetRevisionRequest;
export type PetSubmissionInput = CliPetSubmissionRequest;
export type UploadSession = CliUploadSessionResponse['data'];
export type UploadTarget = CliUploadTarget;

export type DevicePollResult =
  | { response: CliDeviceTokenResponse; status: 'approved' }
  | {
      description: string;
      status:
        | 'access_denied'
        | 'authorization_pending'
        | 'expired_token'
        | 'invalid_client'
        | 'invalid_grant'
        | 'invalid_request'
        | 'slow_down';
    };

export async function requestDeviceCode(siteUrl: string): Promise<DeviceCode> {
  const result = await createCliDeviceCode({
    body: {
      client_id: 'petdb-cli',
      scope: 'petdb:read petdb:write',
    },
    client: cliClient(siteUrl),
  });
  return unwrap(result, ['application/json']);
}

export async function pollDeviceToken(
  siteUrl: string,
  deviceCode: string
): Promise<DevicePollResult> {
  const result = await pollCliDeviceToken({
    body: {
      client_id: 'petdb-cli',
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    },
    client: cliClient(siteUrl),
  });
  assertResponseContentType(result.response, ['application/json']);
  if (result.data) return { response: result.data, status: 'approved' };
  if (isDeviceError(result.error)) {
    return {
      description: result.error.error_description,
      status: result.error.error,
    };
  }
  throw normalizeApiError(result.error, result.response);
}

export async function getCurrentUser(
  siteUrl: string,
  token: string
): Promise<CurrentUser> {
  const result = await getCliCurrentUser({
    client: cliClient(siteUrl, token),
  });
  return unwrap(result, ['application/json', 'application/problem+json']).data;
}

export async function revokeCurrentSession(
  siteUrl: string,
  token: string
): Promise<void> {
  const result = await revokeCliCurrentSession({
    client: cliClient(siteUrl, token),
  });
  unwrap(result, ['application/problem+json'], true);
}

export async function getPetEditSource(
  siteUrl: string,
  token: string,
  slug: string
): Promise<EditSource> {
  const result = await getCliPetEditSource({
    client: cliClient(siteUrl, token),
    path: { slug },
  });
  return unwrap(result, ['application/json', 'application/problem+json']).data;
}

export async function createPetSubmission(
  siteUrl: string,
  token: string,
  idempotencyKey: string,
  input: PetSubmissionInput
): Promise<UploadSession> {
  const result = await createCliPetSubmission({
    body: input,
    client: cliClient(siteUrl, token),
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return unwrap(result, ['application/json', 'application/problem+json']).data;
}

export async function createPetRevision(
  siteUrl: string,
  token: string,
  slug: string,
  idempotencyKey: string,
  input: PetRevisionInput
): Promise<UploadSession> {
  const result = await createCliPetRevision({
    body: input,
    client: cliClient(siteUrl, token),
    headers: { 'Idempotency-Key': idempotencyKey },
    path: { slug },
  });
  return unwrap(result, ['application/json', 'application/problem+json']).data;
}

export async function finalizePetUpload(
  siteUrl: string,
  token: string,
  uploadId: string
): Promise<FinalizedUpload> {
  const result = await finalizeCliPetUpload({
    client: cliClient(siteUrl, token),
    path: { uploadId },
  });
  return unwrap(result, ['application/json', 'application/problem+json']).data;
}

export async function abortPetUpload(
  siteUrl: string,
  token: string,
  uploadId: string
): Promise<void> {
  const result = await abortCliPetUpload({
    client: cliClient(siteUrl, token),
    path: { uploadId },
  });
  unwrap(result, ['application/problem+json'], true);
}

export async function uploadTarget(
  siteUrl: string,
  token: string,
  target: UploadTarget,
  bytes: Uint8Array
): Promise<void> {
  const site = normalizeSiteOrigin(siteUrl);
  const url = new URL(target.url);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    (url.origin !== site && url.protocol !== 'https:')
  ) {
    throw new CliError('The upload target URL is unsafe.', ExitCode.Integrity);
  }
  const headers = new Headers(target.headers);
  if (url.origin === site) headers.set('Authorization', `Bearer ${token}`);
  else headers.delete('Authorization');
  let response: Response;
  try {
    response = await secureFetch(
      new Request(url, {
        body: Uint8Array.from(bytes).buffer,
        headers,
        method: target.method,
      })
    );
  } catch (error) {
    throw networkError('Unable to upload the pet asset.', error);
  }
  if (!response.ok) {
    throw new CliError(
      `Pet asset upload failed with HTTP ${response.status}.`,
      response.status >= 500 ? ExitCode.Service : ExitCode.Integrity,
      { http: await captureHttpDebug(response) }
    );
  }
}

function cliClient(siteUrl: string, token?: string) {
  return createClient({
    auth: token,
    baseUrl: normalizeSiteOrigin(siteUrl),
    fetch: secureFetch,
    headers: {
      Accept: 'application/json, application/problem+json',
      'User-Agent': `petdb/${CLI_VERSION}`,
    },
  });
}

async function secureFetch(input: RequestInfo | URL): Promise<Response> {
  const request = input instanceof Request ? input : new Request(input);
  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  ]);
  return await fetch(new Request(request, { redirect: 'error', signal }));
}

function unwrap<TData, TError>(
  result: {
    data?: TData;
    error?: TError;
    response?: Response;
  },
  contentTypes: string[],
  allowNoContent = false
): TData {
  if (allowNoContent && result.response?.status === 204) {
    return undefined as TData;
  }
  assertResponseContentType(result.response, contentTypes, result.error);
  if (result.data !== undefined) return result.data;
  throw normalizeApiError(result.error, result.response);
}

function assertResponseContentType(
  response: Response | undefined,
  allowed: string[],
  responseValue?: unknown
): void {
  if (!response) return;
  if (response.status === 204) return;
  const type = response.headers.get('content-type')?.split(';', 1)[0]?.trim();
  if (!type || !allowed.includes(type)) {
    throw new CliError(
      'The CLI API returned an unexpected Content-Type.',
      ExitCode.Integrity,
      { http: createHttpDebugInfo(response.status, responseValue) }
    );
  }
}

function normalizeApiError(error: unknown, response?: Response): CliError {
  if (!response) {
    return networkError('Unable to reach the CLI API.', error);
  }
  const message =
    isApiProblem(error) || isDeviceError(error)
      ? 'detail' in error
        ? error.detail
        : error.error_description
      : `CLI API request failed with HTTP ${response.status}.`;
  const options = { http: createHttpDebugInfo(response.status, error) };
  if (response.status === 401 || response.status === 403) {
    return new CliError(message, ExitCode.Auth, options);
  }
  if (response.status === 404) {
    return new CliError(message, ExitCode.Usage, options);
  }
  if ([409, 413, 422].includes(response.status)) {
    return new CliError(message, ExitCode.Integrity, options);
  }
  if (response.status >= 500) {
    return new CliError(message, ExitCode.Service, options);
  }
  return new CliError(message, ExitCode.Network, options);
}

function isApiProblem(value: unknown): value is ApiProblem {
  return (
    isRecord(value) &&
    typeof value.detail === 'string' &&
    typeof value.status === 'number' &&
    typeof value.code === 'string'
  );
}

function isDeviceError(value: unknown): value is CliDeviceError {
  return (
    isRecord(value) &&
    typeof value.error === 'string' &&
    typeof value.error_description === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function networkError(message: string, cause: unknown): CliError {
  return new CliError(
    `${message} ${cause instanceof Error ? cause.message : String(cause)}`,
    ExitCode.Network,
    { cause }
  );
}
