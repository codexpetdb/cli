import { unzipSync } from 'fflate';
import { CliError, ExitCode } from './errors.js';

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY = 0x06064b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR = 0x07064b50;
const ZIP64_EXTRA_FIELD = 0x0001;
const MAX_END_RECORD_SEARCH = 65_557;
const MAX_UNCOMPRESSED_BYTES = 30 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 64 * 1024;
const UNIX_FILE_TYPE_MASK = 0o170000;
const UNIX_SYMLINK_TYPE = 0o120000;

export interface PetFiles {
  manifest: Uint8Array;
  manifestName: 'pet.json';
  sprite: Uint8Array;
  spriteName: 'spritesheet.png' | 'spritesheet.webp';
}

export interface PetPackageSource extends PetFiles {
  manifestRecord: Record<string, unknown> & {
    id: string;
    spritesheetPath: string;
  };
}

export function extractAndValidatePet(
  archive: Uint8Array,
  expectedPetId: string
): PetFiles {
  return extractPetPackage(archive, expectedPetId);
}

export function extractPetPackage(
  archive: Uint8Array,
  expectedPetId?: string
): PetPackageSource {
  const entryNames = inspectCentralDirectory(archive);
  const expectedSprite = entryNames.find(
    (name) => name === 'spritesheet.png' || name === 'spritesheet.webp'
  );

  if (
    entryNames.length !== 2 ||
    !entryNames.includes('pet.json') ||
    !expectedSprite
  ) {
    throw integrityError(
      'Pet package must contain only pet.json and one root spritesheet file.'
    );
  }

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(archive);
  } catch (error) {
    throw integrityError('Pet package is not a valid ZIP archive.', error);
  }

  const manifest = files['pet.json'];
  const sprite = files[expectedSprite];
  if (!manifest || !sprite) {
    throw integrityError(
      'Pet package contents do not match its ZIP directory.'
    );
  }
  if (manifest.byteLength > MAX_MANIFEST_BYTES) {
    throw integrityError('pet.json exceeds the 64 KiB limit.');
  }

  const parsed = parseManifest(manifest);
  if (expectedPetId !== undefined && parsed.id !== expectedPetId) {
    throw integrityError('pet.json id does not match the requested pet id.');
  }
  if (parsed.spritesheetPath !== expectedSprite) {
    throw integrityError(
      'pet.json spritesheetPath does not match the package spritesheet.'
    );
  }

  return {
    manifest,
    manifestRecord: parsed,
    manifestName: 'pet.json',
    sprite,
    spriteName: expectedSprite,
  };
}

function inspectCentralDirectory(archive: Uint8Array): string[] {
  const view = new DataView(
    archive.buffer,
    archive.byteOffset,
    archive.byteLength
  );
  const endOffset = findEndRecord(view);
  rejectZip64Records(view, endOffset);
  const diskNumber = view.getUint16(endOffset + 4, true);
  const directoryDisk = view.getUint16(endOffset + 6, true);
  const entriesOnDisk = view.getUint16(endOffset + 8, true);
  const entryCount = view.getUint16(endOffset + 10, true);
  const directorySize = view.getUint32(endOffset + 12, true);
  const directoryOffset = view.getUint32(endOffset + 16, true);

  if (
    diskNumber !== 0 ||
    directoryDisk !== 0 ||
    entriesOnDisk !== entryCount ||
    entryCount === 0xffff ||
    directorySize === 0xffffffff ||
    directoryOffset === 0xffffffff
  ) {
    throw integrityError(
      'Multi-disk and ZIP64 pet packages are not supported.'
    );
  }
  if (directoryOffset + directorySize > endOffset) {
    throw integrityError(
      'ZIP central directory is outside the package bounds.'
    );
  }

  const names: string[] = [];
  const portableNames = new Set<string>();
  let totalUncompressed = 0;
  let offset = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (
      offset + 46 > archive.byteLength ||
      view.getUint32(offset, true) !== CENTRAL_DIRECTORY_ENTRY
    ) {
      throw integrityError('ZIP central directory is malformed.');
    }

    const flags = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const diskStart = view.getUint16(offset + 34, true);
    const externalAttributes = view.getUint32(offset + 38, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nextOffset =
      offset + 46 + fileNameLength + extraLength + commentLength;

    if (
      nextOffset > archive.byteLength ||
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      diskStart === 0xffff ||
      localHeaderOffset === 0xffffffff
    ) {
      throw integrityError('ZIP entry is outside the package bounds.');
    }
    if ((flags & 0x1) !== 0) {
      throw integrityError('Encrypted ZIP entries are not supported.');
    }

    const unixMode = externalAttributes >>> 16;
    if ((unixMode & UNIX_FILE_TYPE_MASK) === UNIX_SYMLINK_TYPE) {
      throw integrityError('ZIP symbolic links are not allowed.');
    }

    const name = decodePortableName(
      archive.subarray(offset + 46, offset + 46 + fileNameLength)
    );
    rejectZip64Extra(
      view,
      offset + 46 + fileNameLength,
      extraLength,
      'central directory'
    );
    inspectLocalHeader(
      archive,
      view,
      localHeaderOffset,
      directoryOffset,
      compressedSize,
      name
    );
    validateArchivePath(name);
    const portableName = name.toLowerCase();
    if (portableNames.has(portableName)) {
      throw integrityError('ZIP contains duplicate portable file names.');
    }
    portableNames.add(portableName);
    names.push(name);

    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
      throw integrityError('Uncompressed pet package exceeds 30 MiB.');
    }
    offset = nextOffset;
  }

  if (offset !== directoryOffset + directorySize) {
    throw integrityError('ZIP central directory length is inconsistent.');
  }
  return names;
}

function rejectZip64Records(view: DataView, endOffset: number): void {
  const locatorOffset = endOffset - 20;
  if (
    locatorOffset < 0 ||
    view.getUint32(locatorOffset, true) !==
      ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR
  ) {
    return;
  }

  const recordOffset = Number(view.getBigUint64(locatorOffset + 8, true));
  const totalDisks = view.getUint32(locatorOffset + 16, true);
  if (
    totalDisks > 0 &&
    Number.isSafeInteger(recordOffset) &&
    recordOffset >= 0 &&
    recordOffset + 4 <= locatorOffset &&
    view.getUint32(recordOffset, true) === ZIP64_END_OF_CENTRAL_DIRECTORY
  ) {
    throw integrityError('ZIP64 pet packages are not supported.');
  }
}

function inspectLocalHeader(
  archive: Uint8Array,
  view: DataView,
  offset: number,
  directoryOffset: number,
  compressedSize: number,
  expectedName: string
): void {
  if (
    offset + 30 > directoryOffset ||
    view.getUint32(offset, true) !== LOCAL_FILE_HEADER
  ) {
    throw integrityError('ZIP local file header is malformed.');
  }
  const flags = view.getUint16(offset + 6, true);
  const localCompressedSize = view.getUint32(offset + 18, true);
  const localUncompressedSize = view.getUint32(offset + 22, true);
  const fileNameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const fileNameOffset = offset + 30;
  const extraOffset = offset + 30 + fileNameLength;
  const dataOffset = extraOffset + extraLength;
  if (
    dataOffset + compressedSize > directoryOffset ||
    localCompressedSize === 0xffffffff ||
    localUncompressedSize === 0xffffffff
  ) {
    throw integrityError(
      'ZIP local extra fields are outside the package bounds.'
    );
  }
  if ((flags & 0x1) !== 0) {
    throw integrityError('Encrypted ZIP entries are not supported.');
  }
  const localName = decodePortableName(
    archive.subarray(fileNameOffset, fileNameOffset + fileNameLength)
  );
  if (localName !== expectedName) {
    throw integrityError('ZIP local and central file names do not match.');
  }
  rejectZip64Extra(view, extraOffset, extraLength, 'local header');
}

function rejectZip64Extra(
  view: DataView,
  offset: number,
  length: number,
  location: string
): void {
  const end = offset + length;
  while (offset < end) {
    if (offset + 4 > end) {
      throw integrityError(`ZIP ${location} extra fields are malformed.`);
    }
    const headerId = view.getUint16(offset, true);
    const dataLength = view.getUint16(offset + 2, true);
    offset += 4;
    if (offset + dataLength > end) {
      throw integrityError(`ZIP ${location} extra fields are malformed.`);
    }
    if (headerId === ZIP64_EXTRA_FIELD) {
      throw integrityError('ZIP64 extra fields are not supported.');
    }
    offset += dataLength;
  }
}

function findEndRecord(view: DataView): number {
  const minimum = Math.max(0, view.byteLength - MAX_END_RECORD_SEARCH);
  for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) {
      const commentLength = view.getUint16(offset + 20, true);
      if (offset + 22 + commentLength === view.byteLength) return offset;
    }
  }
  throw integrityError('Pet package does not contain a valid ZIP end record.');
}

function decodePortableName(bytes: Uint8Array): string {
  if (bytes.byteLength === 0 || bytes.some((byte) => byte > 0x7f)) {
    throw integrityError('ZIP file names must use portable ASCII characters.');
  }
  return String.fromCharCode(...bytes);
}

function validateArchivePath(name: string): void {
  if (
    name.includes('\0') ||
    name.includes('\\') ||
    name.startsWith('/') ||
    /^[A-Za-z]:/.test(name)
  ) {
    throw integrityError('ZIP contains an unsafe file path.');
  }

  const segments = name.split('/');
  if (
    segments.some(
      (segment) => segment === '' || segment === '.' || segment === '..'
    )
  ) {
    throw integrityError('ZIP contains a path traversal entry.');
  }
}

function parseManifest(bytes: Uint8Array): Record<string, unknown> & {
  id: string;
  spritesheetPath: string;
} {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    throw integrityError('pet.json is not valid UTF-8 JSON.', error);
  }

  if (!value || typeof value !== 'object') {
    throw integrityError('pet.json must contain a JSON object.');
  }
  const manifest = value as Record<string, unknown>;
  if (
    typeof manifest.id !== 'string' ||
    typeof manifest.spritesheetPath !== 'string'
  ) {
    throw integrityError('pet.json must contain id and spritesheetPath.');
  }
  return manifest as Record<string, unknown> & {
    id: string;
    spritesheetPath: string;
  };
}

function integrityError(message: string, cause?: unknown): CliError {
  return new CliError(message, ExitCode.Integrity, { cause });
}
