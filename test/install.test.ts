import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { PetFiles } from '../src/archive.js';
import { ExitCode } from '../src/errors.js';
import {
  installJournalPath,
  installPetFiles,
  recoverInstall,
} from '../src/install.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  );
});

describe('crash-recoverable pet installation', () => {
  it('installs both package files', async () => {
    const root = await tempDirectory();
    const target = path.join(root, 'pets', 'sleepy-fox');
    await installPetFiles(target, files('new'));
    expect(await readFile(path.join(target, 'pet.json'), 'utf8')).toBe('new');
    expect(await readFile(path.join(target, 'spritesheet.png'))).toEqual(
      Buffer.from([1, 2, 3])
    );
  });

  it('replaces an existing install', async () => {
    const root = await tempDirectory();
    const target = path.join(root, 'pets', 'sleepy-fox');
    await installPetFiles(target, files('old'));
    await installPetFiles(target, files('new'));
    expect(await readFile(path.join(target, 'pet.json'), 'utf8')).toBe('new');
  });

  it('restores the old install when the final rename fails', async () => {
    const root = await tempDirectory();
    const target = path.join(root, 'pets', 'sleepy-fox');
    await installPetFiles(target, files('old'));

    const failingRename = (async (from, to) => {
      if (String(from).includes('.tmp-') && String(to) === target) {
        throw new Error('injected rename failure');
      }
      await rename(from, to);
    }) as typeof rename;

    await expect(
      installPetFiles(target, files('new'), { renameImpl: failingRename })
    ).rejects.toEqual(
      expect.objectContaining({ exitCode: ExitCode.FileSystem })
    );
    expect(await readFile(path.join(target, 'pet.json'), 'utf8')).toBe('old');
  });

  it('restores the previous install on the next run after backup interruption', async () => {
    const fixture = await interruptedInstall('backed-up');
    await recoverInstall(fixture.target);
    expect(await readFile(path.join(fixture.target, 'pet.json'), 'utf8')).toBe(
      'old'
    );
    await expect(lstat(fixture.temporary)).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(lstat(fixture.journalPath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('commits the new install on the next run after final rename interruption', async () => {
    const fixture = await interruptedInstall('installed');
    await recoverInstall(fixture.target);
    expect(await readFile(path.join(fixture.target, 'pet.json'), 'utf8')).toBe(
      'new'
    );
    await expect(lstat(fixture.backup)).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(lstat(fixture.journalPath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});

async function tempDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'petdb-install-'));
  temporaryDirectories.push(directory);
  return directory;
}

function files(manifest: string): PetFiles {
  return {
    manifest: new TextEncoder().encode(manifest),
    manifestName: 'pet.json',
    sprite: new Uint8Array([1, 2, 3]),
    spriteName: 'spritesheet.png',
  };
}

async function interruptedInstall(phase: 'backed-up' | 'installed') {
  const root = await tempDirectory();
  const parent = path.join(root, 'pets');
  const target = path.join(parent, 'sleepy-fox');
  const suffix = '00000000-0000-4000-8000-000000000001';
  const temporary = path.join(parent, `.sleepy-fox.tmp-${suffix}`);
  const backup = path.join(parent, `.sleepy-fox.backup-${suffix}`);
  const journalPath = installJournalPath(target);
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'pet.json'), 'old');
  await mkdir(temporary);
  await writeFile(path.join(temporary, 'pet.json'), 'new');
  await writeFile(
    journalPath,
    `${JSON.stringify({
      backupName: path.basename(backup),
      hadTarget: true,
      phase: 'ready',
      schemaVersion: 1,
      targetName: 'sleepy-fox',
      temporaryName: path.basename(temporary),
    })}\n`
  );
  await rename(target, backup);
  if (phase === 'installed') await rename(temporary, target);
  return { backup, journalPath, target, temporary };
}
