import { randomUUID } from 'node:crypto';
import { chmod, mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { CliError, ExitCode } from './errors.js';

const KEYCHAIN_SERVICE = 'codexpetdb-cli';

export interface StoredCredential {
  expiresAt: string;
  token: string;
}

interface CredentialFile {
  credentials: Record<string, StoredCredential>;
  schemaVersion: 1;
}

export async function loadCredential(
  siteUrl: string
): Promise<StoredCredential | null> {
  const site = normalizeSiteOrigin(siteUrl);
  const keychain = await loadKeychainCredential(site);
  if (keychain) return keychain;
  const file = await readCredentialFile();
  return file.credentials[site] ?? null;
}

export async function saveCredential(
  siteUrl: string,
  credential: StoredCredential
): Promise<'file' | 'keychain'> {
  const site = normalizeSiteOrigin(siteUrl);
  if (await saveKeychainCredential(site, credential)) {
    await deleteFileCredential(site);
    return 'keychain';
  }
  const file = await readCredentialFile();
  file.credentials[site] = credential;
  await writeCredentialFile(file);
  return 'file';
}

export async function deleteCredential(siteUrl: string): Promise<void> {
  const site = normalizeSiteOrigin(siteUrl);
  await deleteKeychainCredential(site);
  await deleteFileCredential(site);
}

export function normalizeSiteOrigin(siteUrl: string): string {
  let url: URL;
  try {
    url = new URL(siteUrl);
  } catch (error) {
    throw new CliError('PETDB_SITE_URL must be a valid URL.', ExitCode.Usage, {
      cause: error,
    });
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '' && url.pathname !== '/')
  ) {
    throw new CliError(
      'PETDB_SITE_URL must be an HTTP(S) site origin without a path.',
      ExitCode.Usage
    );
  }
  return url.origin;
}

export function credentialFilePath(
  options: {
    env?: NodeJS.ProcessEnv;
    homeDir?: string;
    platform?: NodeJS.Platform;
  } = {}
): string {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  if (platform === 'win32') {
    const appData = env.APPDATA;
    if (!appData) {
      throw new CliError(
        'APPDATA is required to store credentials on Windows.',
        ExitCode.FileSystem
      );
    }
    return path.win32.join(appData, 'CodexPetDB', 'credentials.json');
  }
  const configHome = env.XDG_CONFIG_HOME?.trim();
  return path.posix.join(
    configHome || path.posix.join(options.homeDir ?? homedir(), '.config'),
    'codexpetdb',
    'credentials.json'
  );
}

async function loadKeychainCredential(
  site: string
): Promise<StoredCredential | null> {
  try {
    const { AsyncEntry } = await import('@napi-rs/keyring');
    const serialized = await new AsyncEntry(
      KEYCHAIN_SERVICE,
      site
    ).getPassword();
    return serialized ? parseCredential(JSON.parse(serialized)) : null;
  } catch {
    return null;
  }
}

async function saveKeychainCredential(
  site: string,
  credential: StoredCredential
): Promise<boolean> {
  try {
    const { AsyncEntry } = await import('@napi-rs/keyring');
    await new AsyncEntry(KEYCHAIN_SERVICE, site).setPassword(
      JSON.stringify(credential)
    );
    return true;
  } catch {
    return false;
  }
}

async function deleteKeychainCredential(site: string): Promise<void> {
  try {
    const { AsyncEntry } = await import('@napi-rs/keyring');
    await new AsyncEntry(KEYCHAIN_SERVICE, site).deleteCredential();
  } catch {
    // The fallback file still needs to be removed when Keychain is absent.
  }
}

async function deleteFileCredential(site: string): Promise<void> {
  const file = await readCredentialFile();
  if (!(site in file.credentials)) return;
  delete file.credentials[site];
  if (Object.keys(file.credentials).length === 0) {
    await rm(credentialFilePath(), { force: true });
    return;
  }
  await writeCredentialFile(file);
}

async function readCredentialFile(): Promise<CredentialFile> {
  let text: string;
  try {
    text = await readFile(credentialFilePath(), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { credentials: {}, schemaVersion: 1 };
    }
    throw fileError('Unable to read the credential file.', error);
  }
  try {
    const value = JSON.parse(text) as unknown;
    if (!isRecord(value) || value.schemaVersion !== 1) throw new Error();
    if (!isRecord(value.credentials)) throw new Error();
    const credentials: Record<string, StoredCredential> = {};
    for (const [site, credential] of Object.entries(value.credentials)) {
      credentials[site] = parseCredential(credential);
    }
    return { credentials, schemaVersion: 1 };
  } catch (error) {
    throw fileError('The credential file is invalid.', error);
  }
}

async function writeCredentialFile(file: CredentialFile): Promise<void> {
  const target = credentialFilePath();
  const directory = path.dirname(target);
  const temporary = path.join(directory, `.credentials-${randomUUID()}.tmp`);
  try {
    await mkdir(directory, { mode: 0o700, recursive: true });
    const handle = await open(temporary, 'wx', 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(file, null, 2)}\n`, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, target);
    if (process.platform !== 'win32') await chmod(target, 0o600);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw fileError('Unable to write the credential file.', error);
  }
}

function parseCredential(value: unknown): StoredCredential {
  if (
    !isRecord(value) ||
    typeof value.token !== 'string' ||
    value.token.length === 0 ||
    typeof value.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(value.expiresAt))
  ) {
    throw new Error('Credential shape is invalid.');
  }
  return { expiresAt: value.expiresAt, token: value.token };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function fileError(message: string, cause: unknown): CliError {
  return new CliError(message, ExitCode.FileSystem, { cause });
}
