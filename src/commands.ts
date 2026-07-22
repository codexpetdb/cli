import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import {
  abortPetUpload,
  createPetRevision,
  createPetSubmission,
  finalizePetUpload,
  getCurrentUser,
  getPetEditSource,
  pollDeviceToken,
  requestDeviceCode,
  revokeCurrentSession,
  uploadTarget,
  type PetRevisionInput,
  type UploadSession,
  type UploadTarget,
} from './api.js';
import {
  deleteCredential,
  loadCredential,
  normalizeSiteOrigin,
  saveCredential,
  type StoredCredential,
} from './credentials.js';
import { DEFAULT_SITE_URL } from './discovery.js';
import { CliError, ExitCode } from './errors.js';
import { assertPetId } from './pet-id.js';
import {
  createRevisionIdempotencyKey,
  discoverSubmissionPaths,
  prepareEditedSpritesheet,
  prepareSubmissionSource,
  prepareZipSource,
  readManifestRecord,
  type PreparedPetSource,
} from './pet-source.js';

export interface CommandOutput {
  stderr: Pick<NodeJS.WriteStream, 'write'>;
  stdout: Pick<NodeJS.WriteStream, 'write'>;
}

export interface EditOptions {
  description?: string;
  displayName?: string;
  manifestPath?: string;
  spritesheetPath?: string;
  zipPath?: string;
}

export async function loginCommand(output: CommandOutput): Promise<void> {
  const site = currentSite();
  const existing = await loadCredential(site);
  if (existing) {
    try {
      const user = await getCurrentUser(site, existing.token);
      output.stdout.write(
        `Already logged in to ${site} as ${user.name} (${user.uid}).\n`
      );
      return;
    } catch (error) {
      if (!(error instanceof CliError) || error.exitCode !== ExitCode.Auth) {
        throw error;
      }
      await deleteCredential(site);
    }
  }

  const device = await requestDeviceCode(site);
  output.stdout.write(`Open: ${device.verification_uri}\n`);
  output.stdout.write(`Code: ${device.user_code}\n`);
  output.stdout.write(`Expires in: ${device.expires_in} seconds\n`);
  openBrowser(device.verification_uri_complete);

  let intervalMs = device.interval * 1000;
  const deadline = Date.now() + device.expires_in * 1000;
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
  };
  process.once('SIGINT', cancel);
  try {
    while (Date.now() < deadline) {
      if (cancelled) {
        throw new CliError('Login cancelled.', ExitCode.Auth);
      }
      await delay(intervalMs);
      if (cancelled) {
        throw new CliError('Login cancelled.', ExitCode.Auth);
      }
      const polled = await pollDeviceToken(site, device.device_code);
      if (polled.status === 'authorization_pending') continue;
      if (polled.status === 'slow_down') {
        intervalMs += 5000;
        continue;
      }
      if (polled.status !== 'approved') {
        throw new CliError(polled.description, ExitCode.Auth);
      }
      const expiresAt = new Date(
        Date.now() + polled.response.expires_in * 1000
      ).toISOString();
      const storage = await saveCredential(site, {
        expiresAt,
        token: polled.response.access_token,
      });
      const user = await getCurrentUser(site, polled.response.access_token);
      output.stdout.write(
        `Logged in to ${site} as ${user.name} (${user.uid}); credential stored in ${storage}.\n`
      );
      return;
    }
  } finally {
    process.removeListener('SIGINT', cancel);
  }
  throw new CliError('The device code expired.', ExitCode.Auth);
}

export async function logoutCommand(
  output: CommandOutput,
  localOnly: boolean
): Promise<void> {
  const site = currentSite();
  const credential = await loadCredential(site);
  if (!credential) {
    output.stdout.write(`No local credential exists for ${site}.\n`);
    return;
  }
  if (!localOnly) {
    await revokeCurrentSession(site, credential.token);
  }
  await deleteCredential(site);
  output.stdout.write(
    localOnly
      ? `Removed the local credential for ${site}.\n`
      : `Logged out from ${site}.\n`
  );
}

export async function whoamiCommand(output: CommandOutput): Promise<void> {
  const site = currentSite();
  const credential = await requireCredential(site);
  const user = await getCurrentUser(site, credential.token);
  output.stdout.write(`Site: ${site}\n`);
  output.stdout.write(`UID: ${user.uid}\n`);
  output.stdout.write(`Name: ${user.name}\n`);
  output.stdout.write(`Email: ${user.email}\n`);
  output.stdout.write(`Session expires: ${user.expiresAt}\n`);
}

export async function submitCommand(
  inputPath: string,
  options: { interactive: boolean; yes: boolean },
  output: CommandOutput
): Promise<void> {
  if (!options.interactive && !options.yes) {
    throw new CliError(
      'submit requires --yes when stdin is not a TTY.',
      ExitCode.Usage
    );
  }
  const sourcePaths = await discoverSubmissionPaths(inputPath);
  if (!options.yes) {
    const accepted = await confirmSubmission(sourcePaths.length);
    if (!accepted) throw new CliError('Submission cancelled.', ExitCode.Usage);
  }
  const site = currentSite();
  const credential = await requireCredential(site);
  let succeeded = 0;
  const failures: { error: CliError; path: string }[] = [];
  for (const sourcePath of sourcePaths) {
    try {
      const prepared = await prepareSubmissionSource(sourcePath);
      const finalized = await submitPreparedPet(site, credential, prepared);
      succeeded += 1;
      output.stdout.write(
        `Submitted '${prepared.id}' as pending revision ${finalized.revisionId}.\n`
      );
    } catch (error) {
      const normalized = normalizeCommandError(error);
      failures.push({ error: normalized, path: sourcePath });
      output.stderr.write(`${sourcePath}: ${normalized.message}\n`);
    }
  }
  output.stdout.write(
    `Submission summary: ${succeeded} succeeded, ${failures.length} failed.\n`
  );
  if (failures.length > 0) {
    throw new CliError(
      `${failures.length} pet submission(s) failed.`,
      failures[0]?.error.exitCode ?? ExitCode.Integrity,
      { cause: failures[0]?.error }
    );
  }
}

export async function editCommand(
  slugInput: string,
  options: EditOptions,
  output: CommandOutput
): Promise<void> {
  const slug = assertPetId(slugInput);
  const site = currentSite();
  const credential = await requireCredential(site);
  const source = await getPetEditSource(site, credential.token, slug);
  let manifest: Record<string, unknown> | undefined;
  let editedSpritesheet:
    | Awaited<ReturnType<typeof prepareEditedSpritesheet>>
    | undefined;

  if (options.zipPath) {
    const prepared = await prepareZipSource(options.zipPath);
    if (prepared.formatVersion !== source.formatVersion) {
      throw new CliError(
        `The edited ZIP must remain format V${source.formatVersion}.`,
        ExitCode.Integrity
      );
    }
    manifest = prepared.manifest;
    editedSpritesheet = {
      bytes: prepared.spritesheetBytes,
      declarations: [prepared.declarations[1], prepared.declarations[2]],
      filename: prepared.spritesheetName,
      posterBytes: prepared.posterBytes,
    };
  } else {
    if (options.manifestPath) {
      manifest = await readManifestRecord(options.manifestPath);
    }
    if (options.spritesheetPath) {
      editedSpritesheet = await prepareEditedSpritesheet(
        options.spritesheetPath,
        source.formatVersion
      );
    }
  }
  const input: PetRevisionInput = {
    ...(options.description === undefined
      ? {}
      : { description: options.description }),
    ...(options.displayName === undefined
      ? {}
      : { displayName: options.displayName }),
    files: editedSpritesheet?.declarations ?? [],
    ...(manifest ? { manifest } : {}),
    sourceRevisionId: source.revisionId,
  };
  const idempotencyKey = createRevisionIdempotencyKey(
    source.revisionId,
    input,
    editedSpritesheet?.bytes
  );
  let upload: UploadSession | undefined;
  try {
    upload = await createPetRevision(
      site,
      credential.token,
      slug,
      idempotencyKey,
      input
    );
    if (editedSpritesheet) {
      await uploadAssets(
        site,
        credential.token,
        upload.uploadTargets,
        new Map([
          ['poster', editedSpritesheet.posterBytes],
          ['spritesheet', editedSpritesheet.bytes],
        ])
      );
    } else if (upload.uploadTargets.length !== 0) {
      throw new CliError(
        'The CLI API returned unexpected edit upload targets.',
        ExitCode.Integrity
      );
    }
    const finalized = await finalizePetUpload(
      site,
      credential.token,
      upload.uploadId
    );
    output.stdout.write(
      `Created pending revision ${finalized.revisionId} for '${slug}'. The active revision is unchanged until approval.\n`
    );
  } catch (error) {
    if (upload) {
      await abortPetUpload(site, credential.token, upload.uploadId).catch(
        () => undefined
      );
    }
    throw error;
  }
}

async function submitPreparedPet(
  site: string,
  credential: StoredCredential,
  prepared: PreparedPetSource
) {
  let upload: UploadSession | undefined;
  try {
    upload = await createPetSubmission(
      site,
      credential.token,
      prepared.idempotencyKey,
      {
        description: prepared.description,
        displayName: prepared.displayName,
        files: prepared.declarations,
        formatVersion: prepared.formatVersion,
        slug: prepared.id,
      }
    );
    await uploadAssets(
      site,
      credential.token,
      upload.uploadTargets,
      new Map([
        ['manifest', prepared.manifestBytes],
        ['poster', prepared.posterBytes],
        ['spritesheet', prepared.spritesheetBytes],
      ])
    );
    return await finalizePetUpload(site, credential.token, upload.uploadId);
  } catch (error) {
    if (upload) {
      await abortPetUpload(site, credential.token, upload.uploadId).catch(
        () => undefined
      );
    }
    throw error;
  }
}

async function uploadAssets(
  site: string,
  token: string,
  targets: UploadTarget[],
  assets: Map<string, Uint8Array>
): Promise<void> {
  const seen = new Set<string>();
  for (const target of targets) {
    if (seen.has(target.role)) {
      throw new CliError(
        `The CLI API returned a duplicate ${target.role} upload target.`,
        ExitCode.Integrity
      );
    }
    const bytes = assets.get(target.role);
    if (!bytes) {
      throw new CliError(
        `The CLI API returned an unexpected ${target.role} upload target.`,
        ExitCode.Integrity
      );
    }
    seen.add(target.role);
    await uploadTarget(site, token, target, bytes);
  }
  if (seen.size !== assets.size) {
    throw new CliError(
      'The CLI API omitted a required upload target.',
      ExitCode.Integrity
    );
  }
}

async function requireCredential(site: string): Promise<StoredCredential> {
  const credential = await loadCredential(site);
  if (!credential) {
    throw new CliError(
      `Not logged in to ${site}. Run 'petdb login'.`,
      ExitCode.Auth
    );
  }
  return credential;
}

async function confirmSubmission(count: number): Promise<boolean> {
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await prompt.question(
      `Submit ${count} pet package${count === 1 ? '' : 's'} for review? [y/N] `
    );
    return answer.trim().toLowerCase() === 'y';
  } finally {
    prompt.close();
  }
}

function currentSite(): string {
  return normalizeSiteOrigin(process.env.PETDB_SITE_URL ?? DEFAULT_SITE_URL);
}

function openBrowser(url: string): void {
  const command =
    process.platform === 'darwin'
      ? { args: [url], file: 'open' }
      : process.platform === 'win32'
        ? { args: ['/c', 'start', '', url], file: 'cmd' }
        : { args: [url], file: 'xdg-open' };
  try {
    const child = spawn(command.file, command.args, {
      detached: true,
      stdio: 'ignore',
    });
    child.on('error', () => undefined);
    child.unref();
  } catch {
    // The verification URL and code remain visible when no browser is present.
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizeCommandError(error: unknown): CliError {
  if (error instanceof CliError) return error;
  return new CliError(
    error instanceof Error ? error.message : String(error),
    ExitCode.FileSystem,
    { cause: error }
  );
}
