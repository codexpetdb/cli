import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { extractAndValidatePet } from '../src/archive.js';
import { type CliError, ExitCode } from '../src/errors.js';

describe('pet ZIP validation', () => {
  it('extracts an exact two-file pet package', () => {
    const archive = petArchive('sleepy-fox');
    const files = extractAndValidatePet(archive, 'sleepy-fox');
    expect(files.spriteName).toBe('spritesheet.png');
    expect(new TextDecoder().decode(files.manifest)).toContain('sleepy-fox');
  });

  it('rejects zip-slip and nested paths', () => {
    const archive = zipSync({
      '../pet.json': strToU8('{}'),
      'spritesheet.png': new Uint8Array([1]),
    });
    expectIntegrityFailure(() => extractAndValidatePet(archive, 'sleepy-fox'));
  });

  it('rejects extra files', () => {
    const archive = zipSync({
      'pet.json': manifest('sleepy-fox'),
      'spritesheet.png': new Uint8Array([1]),
      'unexpected.txt': strToU8('no'),
    });
    expectIntegrityFailure(() => extractAndValidatePet(archive, 'sleepy-fox'));
  });

  it('rejects a manifest id mismatch', () => {
    expectIntegrityFailure(() =>
      extractAndValidatePet(petArchive('other-pet'), 'sleepy-fox')
    );
  });

  it('rejects a manifest spritesheet mismatch', () => {
    const archive = zipSync({
      'pet.json': strToU8(
        JSON.stringify({
          id: 'sleepy-fox',
          spritesheetPath: 'spritesheet.png',
        })
      ),
      'spritesheet.webp': new Uint8Array([1]),
    });
    expectIntegrityFailure(() => extractAndValidatePet(archive, 'sleepy-fox'));
  });

  it('accepts a WebP spritesheet when the manifest matches', () => {
    const archive = zipSync({
      'pet.json': strToU8(
        JSON.stringify({
          id: 'sleepy-fox',
          spritesheetPath: 'spritesheet.webp',
        })
      ),
      'spritesheet.webp': new Uint8Array([1]),
    });
    expect(extractAndValidatePet(archive, 'sleepy-fox').spriteName).toBe(
      'spritesheet.webp'
    );
  });

  it('rejects ZIP64 extra fields in local and central headers', () => {
    const archive = zipSync({
      'pet.json': [manifest('sleepy-fox'), { extra: { 1: new Uint8Array(8) } }],
      'spritesheet.png': new Uint8Array([1]),
    });
    expectIntegrityFailure(() => extractAndValidatePet(archive, 'sleepy-fox'));
  });

  it('rejects structural ZIP64 end records', () => {
    const archive = addZip64EndRecords(petArchive('sleepy-fox'));
    expectIntegrityFailure(() => extractAndValidatePet(archive, 'sleepy-fox'));
  });

  it('accepts ZIP64 signature bytes inside ordinary file data', () => {
    const archive = zipSync(
      {
        'pet.json': manifest('sleepy-fox'),
        'spritesheet.png': new Uint8Array([
          0x50, 0x4b, 0x06, 0x06, 0x50, 0x4b, 0x06, 0x07,
        ]),
      },
      { level: 0 }
    );
    expect(() => extractAndValidatePet(archive, 'sleepy-fox')).not.toThrow();
  });

  it('rejects ZIP64 sentinel sizes without an extra field', () => {
    const archive = petArchive('sleepy-fox').slice();
    const centralOffset = findSignature(archive, [0x50, 0x4b, 0x01, 0x02]);
    new DataView(archive.buffer).setUint32(
      centralOffset + 20,
      0xffffffff,
      true
    );
    expectIntegrityFailure(() => extractAndValidatePet(archive, 'sleepy-fox'));
  });

  it('rejects ZIP64 sentinel sizes in local headers', () => {
    const archive = petArchive('sleepy-fox').slice();
    const localOffset = findSignature(archive, [0x50, 0x4b, 0x03, 0x04]);
    new DataView(archive.buffer).setUint32(localOffset + 18, 0xffffffff, true);
    expectIntegrityFailure(() => extractAndValidatePet(archive, 'sleepy-fox'));
  });
});

function petArchive(id: string): Uint8Array {
  return zipSync({
    'pet.json': manifest(id),
    'spritesheet.png': new Uint8Array([1, 2, 3]),
  });
}

function manifest(id: string): Uint8Array {
  return strToU8(JSON.stringify({ id, spritesheetPath: 'spritesheet.png' }));
}

function expectIntegrityFailure(fn: () => unknown): void {
  expect(fn).toThrowError(
    expect.objectContaining<Partial<CliError>>({
      exitCode: ExitCode.Integrity,
    })
  );
}

function addZip64EndRecords(archive: Uint8Array): Uint8Array {
  let endOffset = -1;
  for (let index = archive.byteLength - 22; index >= 0; index -= 1) {
    if (
      archive[index] === 0x50 &&
      archive[index + 1] === 0x4b &&
      archive[index + 2] === 0x05 &&
      archive[index + 3] === 0x06
    ) {
      endOffset = index;
      break;
    }
  }
  if (endOffset < 0) throw new Error('Fixture ZIP end record is missing.');
  const result = new Uint8Array(archive.byteLength + 76);
  result.set(archive.subarray(0, endOffset));
  const view = new DataView(result.buffer);
  view.setUint32(endOffset, 0x06064b50, true);
  view.setBigUint64(endOffset + 4, 44n, true);
  const locatorOffset = endOffset + 56;
  view.setUint32(locatorOffset, 0x07064b50, true);
  view.setBigUint64(locatorOffset + 8, BigInt(endOffset), true);
  view.setUint32(locatorOffset + 16, 1, true);
  result.set(archive.subarray(endOffset), endOffset + 76);
  return result;
}

function findSignature(archive: Uint8Array, signature: number[]): number {
  for (
    let index = 0;
    index <= archive.byteLength - signature.length;
    index += 1
  ) {
    if (signature.every((byte, offset) => archive[index + offset] === byte)) {
      return index;
    }
  }
  throw new Error('Fixture ZIP signature is missing.');
}
