import { createHash, randomUUID } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp, { type Metadata } from 'sharp';
import { extractPetPackage, type PetPackageSource } from './archive.js';
import type { PetSubmissionInput, PetRevisionInput } from './api.js';
import { CliError, ExitCode } from './errors.js';
import { assertPetId } from './pet-id.js';

const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_SPRITESHEET_BYTES = 10 * 1024 * 1024;
const RESERVED_IDS = new Set([
  'admin',
  'api',
  'auth',
  'assets',
  'collections',
  'create',
  'creators',
  'download',
  'docs',
  'en',
  'internal',
  'new',
  'pets',
  'requests',
  'upload',
  'users',
  'www',
  'zh',
]);

export interface PreparedPetSource {
  declarations: PetSubmissionInput['files'];
  description: string;
  displayName: string;
  formatVersion: 1 | 2;
  id: string;
  idempotencyKey: string;
  manifest: Record<string, unknown>;
  manifestBytes: Uint8Array;
  posterBytes: Uint8Array;
  sourcePath: string;
  spritesheetBytes: Uint8Array;
  spritesheetName: 'spritesheet.png' | 'spritesheet.webp';
}

export async function loadSubmissionSources(
  inputPath: string
): Promise<PreparedPetSource[]> {
  return await Promise.all(
    (await discoverSubmissionPaths(inputPath)).map(prepareSubmissionSource)
  );
}

export async function discoverSubmissionPaths(
  inputPath: string
): Promise<string[]> {
  const resolved = path.resolve(inputPath);
  const info = await safeStat(resolved);
  if (!info) {
    throw new CliError(`'${inputPath}' does not exist.`, ExitCode.FileSystem);
  }
  if (info.isFile()) return [resolved];
  if (!info.isDirectory()) {
    throw new CliError(
      `'${inputPath}' is not a directory or ZIP archive.`,
      ExitCode.Usage
    );
  }
  if (await isFile(path.join(resolved, 'pet.json'))) {
    return [resolved];
  }
  const entries = await readdir(resolved, { withFileTypes: true });
  const childDirectories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(resolved, entry.name))
    .sort();
  const packageDirectories: string[] = [];
  for (const directory of childDirectories) {
    if (await isFile(path.join(directory, 'pet.json'))) {
      packageDirectories.push(directory);
    }
  }
  if (packageDirectories.length === 0) {
    throw new CliError(
      `'${inputPath}' contains no pet package directories.`,
      ExitCode.Usage
    );
  }
  return packageDirectories;
}

export async function prepareSubmissionSource(
  sourcePath: string
): Promise<PreparedPetSource> {
  const info = await safeStat(sourcePath);
  if (info?.isDirectory()) return await prepareDirectorySource(sourcePath);
  return await prepareZipSource(sourcePath);
}

export async function prepareDirectorySource(
  directory: string
): Promise<PreparedPetSource> {
  const manifestBytes = new Uint8Array(
    await readBoundedFile(
      path.join(directory, 'pet.json'),
      MAX_MANIFEST_BYTES,
      'pet.json'
    )
  );
  const manifest = parseManifest(manifestBytes);
  const spriteName = assertSpritesheetName(manifest.spritesheetPath);
  const spritesheetBytes = new Uint8Array(
    await readBoundedFile(
      path.join(directory, spriteName),
      MAX_SPRITESHEET_BYTES,
      spriteName
    )
  );
  return await prepareSource(
    {
      manifest: manifestBytes,
      manifestName: 'pet.json',
      manifestRecord: manifest,
      sprite: spritesheetBytes,
      spriteName,
    },
    directory
  );
}

export async function prepareZipSource(
  archivePath: string
): Promise<PreparedPetSource> {
  if (!archivePath.toLowerCase().endsWith('.zip')) {
    throw new CliError(
      'Submission files must be ZIP archives.',
      ExitCode.Usage
    );
  }
  const bytes = new Uint8Array(await readFile(archivePath));
  return await prepareSource(extractPetPackage(bytes), archivePath);
}

export function createRevisionIdempotencyKey(
  sourceRevisionId: string,
  input: PetRevisionInput,
  spritesheetBytes?: Uint8Array
): string {
  const hash = createHash('sha256');
  hash.update(sourceRevisionId);
  hash.update('\0');
  hash.update(canonicalJsonBytes(input));
  if (spritesheetBytes) {
    hash.update('\0');
    hash.update(spritesheetBytes);
  }
  return `petdb-edit-v2:${randomUUID()}:${hash.digest('hex')}`;
}

export async function readManifestRecord(
  manifestPath: string
): Promise<Record<string, unknown>> {
  return parseManifest(
    new Uint8Array(
      await readBoundedFile(
        path.resolve(manifestPath),
        MAX_MANIFEST_BYTES,
        'pet.json'
      )
    )
  );
}

export async function prepareEditedSpritesheet(
  spritesheetPath: string,
  expectedFormatVersion: 1 | 2
): Promise<{
  bytes: Uint8Array;
  declarations: PetRevisionInput['files'];
  filename: 'spritesheet.png' | 'spritesheet.webp';
  posterBytes: Uint8Array;
}> {
  const filename = path.basename(spritesheetPath);
  const supportedName = assertSpritesheetName(filename);
  const bytes = new Uint8Array(
    await readBoundedFile(
      path.resolve(spritesheetPath),
      MAX_SPRITESHEET_BYTES,
      supportedName
    )
  );
  const prepared = await prepareSource(
    {
      manifest: new Uint8Array(),
      manifestName: 'pet.json',
      manifestRecord: {
        description: 'Temporary edit validation',
        displayName: 'Temporary edit validation',
        id: 'temporary-edit-validation',
        spritesheetPath: supportedName,
      },
      sprite: bytes,
      spriteName: supportedName,
    },
    spritesheetPath
  );
  if (prepared.formatVersion !== expectedFormatVersion) {
    throw new CliError(
      `The edited spritesheet must remain format V${expectedFormatVersion}.`,
      ExitCode.Integrity
    );
  }
  return {
    bytes,
    declarations: [prepared.declarations[1], prepared.declarations[2]],
    filename: supportedName,
    posterBytes: prepared.posterBytes,
  };
}

async function prepareSource(
  source: PetPackageSource,
  sourcePath: string
): Promise<PreparedPetSource> {
  const id = assertPetId(source.manifestRecord.id);
  if (RESERVED_IDS.has(id)) {
    throw new CliError(`Pet id '${id}' is reserved.`, ExitCode.Integrity);
  }
  const spritesheetName = assertSpritesheetName(
    source.manifestRecord.spritesheetPath
  );
  if (spritesheetName !== source.spriteName) {
    throw new CliError(
      'pet.json spritesheetPath does not match the spritesheet.',
      ExitCode.Integrity
    );
  }
  const displayName = requiredText(
    source.manifestRecord.displayName,
    'displayName',
    100
  );
  const description = requiredText(
    source.manifestRecord.description,
    'description',
    1000
  );
  if (source.sprite.byteLength > MAX_SPRITESHEET_BYTES) {
    throw new CliError(
      'The spritesheet exceeds the 10 MiB limit.',
      ExitCode.Integrity
    );
  }
  let metadata: Metadata;
  try {
    metadata = await sharp(source.sprite, { failOn: 'error' }).metadata();
  } catch (error) {
    throw new CliError(
      'The spritesheet is not a valid PNG or WebP image.',
      ExitCode.Integrity,
      { cause: error }
    );
  }
  const expectedFormat = spritesheetName.endsWith('.png') ? 'png' : 'webp';
  if (metadata.format !== expectedFormat) {
    throw new CliError(
      'The spritesheet signature does not match its extension.',
      ExitCode.Integrity
    );
  }
  const formatVersion = inferFormatVersion(metadata.width, metadata.height);
  if (!metadata.hasAlpha) {
    throw new CliError(
      'The spritesheet must support alpha transparency.',
      ExitCode.Integrity
    );
  }
  if (
    source.manifestRecord.formatVersion !== undefined &&
    source.manifestRecord.formatVersion !== formatVersion
  ) {
    throw new CliError(
      'pet.json formatVersion does not match the spritesheet dimensions.',
      ExitCode.Integrity
    );
  }
  const manifest = {
    ...source.manifestRecord,
    description,
    displayName,
    formatVersion,
    id,
    spritesheetPath: spritesheetName,
  };
  const manifestBytes = canonicalJsonBytes(manifest);
  if (manifestBytes.byteLength > MAX_MANIFEST_BYTES) {
    throw new CliError(
      'Canonical pet.json exceeds the 64 KiB limit.',
      ExitCode.Integrity
    );
  }
  let posterBytes: Uint8Array;
  try {
    posterBytes = new Uint8Array(
      await sharp(source.sprite, { failOn: 'error' })
        .extract({ height: 208, left: 0, top: 0, width: 192 })
        .webp({ quality: 90 })
        .toBuffer()
    );
  } catch (error) {
    throw new CliError(
      'Unable to generate poster.webp from the spritesheet.',
      ExitCode.Integrity,
      { cause: error }
    );
  }
  const declarations = [
    declaration('manifest', 'pet.json', 'application/json', manifestBytes),
    declaration(
      'spritesheet',
      spritesheetName,
      spritesheetName.endsWith('.png') ? 'image/png' : 'image/webp',
      source.sprite
    ),
    declaration('poster', 'poster.webp', 'image/webp', posterBytes),
  ] satisfies PetSubmissionInput['files'];
  const keyHash = createHash('sha256')
    .update(manifestBytes)
    .update('\0')
    .update(source.sprite)
    .digest('hex');
  return {
    declarations,
    description,
    displayName,
    formatVersion,
    id,
    idempotencyKey: `petdb-submit-v1:${keyHash}`,
    manifest,
    manifestBytes,
    posterBytes,
    sourcePath,
    spritesheetBytes: source.sprite,
    spritesheetName,
  };
}

function declaration(
  role: 'manifest' | 'poster' | 'spritesheet',
  filename: 'pet.json' | 'poster.webp' | 'spritesheet.png' | 'spritesheet.webp',
  contentType: 'application/json' | 'image/png' | 'image/webp',
  bytes: Uint8Array
) {
  return {
    byteSize: bytes.byteLength,
    contentType,
    filename,
    role,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

function canonicalJsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(sortJson(value)));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortJson(child)])
  );
}

function parseManifest(
  bytes: Uint8Array
): Record<string, unknown> & { id: string; spritesheetPath: string } {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    throw new CliError(
      'pet.json is not valid UTF-8 JSON.',
      ExitCode.Integrity,
      {
        cause: error,
      }
    );
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CliError(
      'pet.json must contain a JSON object.',
      ExitCode.Integrity
    );
  }
  const manifest = value as Record<string, unknown>;
  if (
    typeof manifest.id !== 'string' ||
    typeof manifest.spritesheetPath !== 'string'
  ) {
    throw new CliError(
      'pet.json must contain id and spritesheetPath.',
      ExitCode.Integrity
    );
  }
  return manifest as Record<string, unknown> & {
    id: string;
    spritesheetPath: string;
  };
}

function requiredText(value: unknown, field: string, max: number): string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > max
  ) {
    throw new CliError(`pet.json ${field} is invalid.`, ExitCode.Integrity);
  }
  return value.trim();
}

function assertSpritesheetName(
  value: unknown
): 'spritesheet.png' | 'spritesheet.webp' {
  if (value !== 'spritesheet.png' && value !== 'spritesheet.webp') {
    throw new CliError(
      'pet.json spritesheetPath must be spritesheet.png or spritesheet.webp.',
      ExitCode.Integrity
    );
  }
  return value;
}

function inferFormatVersion(
  width: number | undefined,
  height: number | undefined
): 1 | 2 {
  if (width === 1536 && height === 1872) return 1;
  if (width === 1536 && height === 2288) return 2;
  throw new CliError(
    'The atlas must be 1536×1872 (V1) or 1536×2288 (V2).',
    ExitCode.Integrity
  );
}

async function readBoundedFile(
  filePath: string,
  maximum: number,
  name: string
): Promise<Buffer> {
  const info = await safeStat(filePath);
  if (!info?.isFile()) {
    throw new CliError(`${name} is missing.`, ExitCode.FileSystem);
  }
  if (info.size === 0 || info.size > maximum) {
    throw new CliError(`${name} has an invalid size.`, ExitCode.Integrity);
  }
  return await readFile(filePath);
}

async function safeStat(filePath: string) {
  try {
    return await stat(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new CliError(
      `Unable to inspect '${filePath}'.`,
      ExitCode.FileSystem,
      {
        cause: error,
      }
    );
  }
}

async function isFile(filePath: string): Promise<boolean> {
  return (await safeStat(filePath))?.isFile() ?? false;
}
