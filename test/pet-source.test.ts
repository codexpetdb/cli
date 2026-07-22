import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import type { PetRevisionInput } from '../src/api.js';
import {
  createRevisionIdempotencyKey,
  discoverSubmissionPaths,
  prepareDirectorySource,
} from '../src/pet-source.js';

describe('pet submission sources', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true }))
    );
  });

  it.each([
    { extension: 'png', height: 1872, version: 1 },
    { extension: 'webp', height: 2288, version: 2 },
  ] as const)('accepts a transparent V$version $extension atlas and generates poster.webp', async ({
    extension,
    height,
    version,
  }) => {
    const directory = await petDirectory({ extension, height });
    const prepared = await prepareDirectorySource(directory);

    expect(prepared.formatVersion).toBe(version);
    expect(prepared.spritesheetName).toBe(`spritesheet.${extension}`);
    expect(prepared.declarations.map((item) => item.role)).toEqual([
      'manifest',
      'spritesheet',
      'poster',
    ]);
    expect(prepared.idempotencyKey).toMatch(/^petdb-submit-v1:[a-f0-9]{64}$/u);
    await expect(sharp(prepared.posterBytes).metadata()).resolves.toMatchObject(
      {
        format: 'webp',
        height: 208,
        width: 192,
      }
    );
    const posterPixel = await sharp(prepared.posterBytes)
      .ensureAlpha()
      .raw()
      .toBuffer();
    expect(posterPixel[3]).toBe(0);
  });

  it('rejects a mismatched extension and image signature', async () => {
    const directory = await petDirectory({ extension: 'png', height: 1872 });
    const png = await sharp({
      create: {
        background: { alpha: 0, b: 0, g: 0, r: 0 },
        channels: 4,
        height: 1872,
        width: 1536,
      },
    })
      .webp()
      .toBuffer();
    await writeFile(path.join(directory, 'spritesheet.png'), png);

    await expect(prepareDirectorySource(directory)).rejects.toThrow(
      'signature does not match its extension'
    );
  });

  it('rejects invalid dimensions and images without alpha', async () => {
    const invalidDimensions = await petDirectory({
      extension: 'png',
      height: 100,
    });
    await expect(prepareDirectorySource(invalidDimensions)).rejects.toThrow(
      '1536×1872 (V1) or 1536×2288 (V2)'
    );

    const noAlpha = await petDirectory({
      channels: 3,
      extension: 'png',
      height: 1872,
    });
    await expect(prepareDirectorySource(noAlpha)).rejects.toThrow(
      'support alpha transparency'
    );
  });

  it('discovers only direct child package directories in stable order', async () => {
    const parent = await temporaryDirectory();
    const second = await petDirectory({
      extension: 'webp',
      height: 2288,
      parent,
      slug: 'zebra',
    });
    const first = await petDirectory({
      extension: 'png',
      height: 1872,
      parent,
      slug: 'alpaca',
    });
    await mkdir(path.join(parent, 'not-a-package'));

    await expect(discoverSubmissionPaths(parent)).resolves.toEqual([
      first,
      second,
    ]);
  });

  it('scopes edit idempotency to one command invocation', () => {
    const sourceRevisionId = '0197c001-7c00-7000-8000-000000000001';
    const input = {
      description: 'Updated description',
      files: [],
      sourceRevisionId,
    } satisfies PetRevisionInput;
    const first = createRevisionIdempotencyKey(sourceRevisionId, input);
    const second = createRevisionIdempotencyKey(sourceRevisionId, input);

    expect(first).toMatch(/^petdb-edit-v2:[0-9a-f-]{36}:[a-f0-9]{64}$/u);
    expect(second).toMatch(/^petdb-edit-v2:[0-9a-f-]{36}:[a-f0-9]{64}$/u);
    expect(first).not.toBe(second);
    expect(first.split(':').at(-1)).toBe(second.split(':').at(-1));
  });

  async function petDirectory(options: {
    channels?: 3 | 4;
    extension: 'png' | 'webp';
    height: number;
    parent?: string;
    slug?: string;
  }): Promise<string> {
    const slug = options.slug ?? `pet-${temporaryDirectories.length}`;
    const parent = options.parent ?? (await temporaryDirectory());
    const directory = path.join(parent, slug);
    await mkdir(directory, { recursive: true });
    const channels = options.channels ?? 4;
    const image = sharp({
      create: {
        background:
          channels === 4
            ? { alpha: 0, b: 30, g: 20, r: 10 }
            : { b: 30, g: 20, r: 10 },
        channels,
        height: options.height,
        width: 1536,
      },
    });
    const spritesheet =
      options.extension === 'png'
        ? await image.png().toBuffer()
        : await image.webp({ quality: 90 }).toBuffer();
    await Promise.all([
      writeFile(
        path.join(directory, 'pet.json'),
        JSON.stringify({
          description: `${slug} description`,
          displayName: slug,
          id: slug,
          spritesheetPath: `spritesheet.${options.extension}`,
        })
      ),
      writeFile(
        path.join(directory, `spritesheet.${options.extension}`),
        spritesheet
      ),
    ]);
    return directory;
  }

  async function temporaryDirectory(): Promise<string> {
    const directory = await mkdtemp(path.join(tmpdir(), 'petdb-source-'));
    temporaryDirectories.push(directory);
    return directory;
  }
});
