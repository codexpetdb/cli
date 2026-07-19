import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import type { PetFiles } from './archive.js';
import { CliError, ExitCode } from './errors.js';

type Rename = typeof rename;
type JournalPhase = 'planned' | 'ready' | 'backed-up' | 'installed';

interface InstallOptions {
  renameImpl?: Rename;
}

interface InstallJournal {
  backupName: string;
  hadTarget: boolean;
  phase: JournalPhase;
  schemaVersion: 1;
  targetName: string;
  temporaryName: string;
}

export async function installPetFiles(
  targetDirectory: string,
  files: PetFiles,
  options: InstallOptions = {}
): Promise<void> {
  const parent = path.dirname(targetDirectory);
  const targetName = path.basename(targetDirectory);
  const suffix = randomUUID();
  const journalPath = installJournalPath(targetDirectory);
  const journal: InstallJournal = {
    backupName: `.${targetName}.backup-${suffix}`,
    hadTarget: false,
    phase: 'planned',
    schemaVersion: 1,
    targetName,
    temporaryName: `.${targetName}.tmp-${suffix}`,
  };
  const temporary = path.join(parent, journal.temporaryName);
  let journalCreated = false;

  try {
    await mkdir(parent, { recursive: true });
    await recoverInstall(targetDirectory, options);
    journal.hadTarget = await exists(targetDirectory);
    await createJournal(journalPath, journal);
    journalCreated = true;
    await mkdir(temporary, { mode: 0o755 });
    await writeDurableFile(
      path.join(temporary, files.manifestName),
      files.manifest
    );
    await writeDurableFile(
      path.join(temporary, files.spriteName),
      files.sprite
    );
    journal.phase = 'ready';
    await appendJournal(journalPath, journal);
    await replaceDirectoryRecoverably(targetDirectory, journal, options);
  } catch (error) {
    if (journalCreated) {
      try {
        await recoverInstall(targetDirectory, options);
      } catch (recoveryError) {
        throw new CliError(
          `Installation failed and recovery could not complete: ${errorMessage(recoveryError)}`,
          ExitCode.FileSystem,
          { cause: error }
        );
      }
    }
    if (error instanceof CliError) throw error;
    throw new CliError(
      `Unable to install pet files: ${errorMessage(error)}`,
      ExitCode.FileSystem,
      { cause: error }
    );
  }
}

export async function recoverInstall(
  targetDirectory: string,
  options: InstallOptions = {}
): Promise<void> {
  const journalPath = installJournalPath(targetDirectory);
  if (!(await exists(journalPath))) return;

  const journal = await readJournal(journalPath, targetDirectory);
  const parent = path.dirname(targetDirectory);
  const temporary = path.join(parent, journal.temporaryName);
  const backup = path.join(parent, journal.backupName);
  const renameImpl = options.renameImpl ?? rename;
  const [targetExists, backupExists] = await Promise.all([
    exists(targetDirectory),
    exists(backup),
  ]);

  if (backupExists) {
    if (targetExists) {
      await rm(backup, { force: true, recursive: true });
    } else {
      await renameImpl(backup, targetDirectory);
    }
  } else if (journal.hadTarget && !targetExists) {
    throw new CliError(
      `Cannot recover '${journal.targetName}': both target and backup are missing.`,
      ExitCode.FileSystem
    );
  }

  await rm(temporary, { force: true, recursive: true });
  await rm(journalPath, { force: true });
}

export function installJournalPath(targetDirectory: string): string {
  const parent = path.dirname(targetDirectory);
  const targetName = path.basename(targetDirectory);
  return path.join(parent, `.${targetName}.install-journal`);
}

async function replaceDirectoryRecoverably(
  target: string,
  journal: InstallJournal,
  options: InstallOptions
): Promise<void> {
  const parent = path.dirname(target);
  const temporary = path.join(parent, journal.temporaryName);
  const backup = path.join(parent, journal.backupName);
  const journalPath = installJournalPath(target);
  const renameImpl = options.renameImpl ?? rename;

  if (journal.hadTarget) {
    await renameImpl(target, backup);
    journal.phase = 'backed-up';
    await appendJournal(journalPath, journal);
  }

  await renameImpl(temporary, target);
  journal.phase = 'installed';
  await appendJournal(journalPath, journal);
  await rm(backup, { force: true, recursive: true });
  await rm(journalPath, { force: true });
}

async function createJournal(
  journalPath: string,
  journal: InstallJournal
): Promise<void> {
  const handle = await open(journalPath, 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(journal)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function appendJournal(
  journalPath: string,
  journal: InstallJournal
): Promise<void> {
  const handle = await open(journalPath, 'a', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(journal)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function readJournal(
  journalPath: string,
  targetDirectory: string
): Promise<InstallJournal> {
  const lines = (await readFile(journalPath, 'utf8'))
    .split('\n')
    .filter((line) => line.trim() !== '');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const value = JSON.parse(lines[index] as string) as unknown;
      if (isValidJournal(value, targetDirectory)) return value;
    } catch {
      // A crash may leave one incomplete trailing journal entry.
    }
  }
  throw new CliError(
    `Install journal for '${path.basename(targetDirectory)}' is invalid.`,
    ExitCode.FileSystem
  );
}

function isValidJournal(
  value: unknown,
  targetDirectory: string
): value is InstallJournal {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const journal = value as Partial<InstallJournal>;
  const targetName = path.basename(targetDirectory);
  const keys = Object.keys(journal).sort();
  const expectedKeys = [
    'backupName',
    'hadTarget',
    'phase',
    'schemaVersion',
    'targetName',
    'temporaryName',
  ].sort();
  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index]) &&
    journal.schemaVersion === 1 &&
    journal.targetName === targetName &&
    typeof journal.hadTarget === 'boolean' &&
    isJournalPhase(journal.phase) &&
    isGeneratedName(journal.temporaryName, `.${targetName}.tmp-`) &&
    isGeneratedName(journal.backupName, `.${targetName}.backup-`)
  );
}

function isJournalPhase(value: unknown): value is JournalPhase {
  return (
    value === 'planned' ||
    value === 'ready' ||
    value === 'backed-up' ||
    value === 'installed'
  );
}

function isGeneratedName(value: unknown, prefix: string): value is string {
  if (typeof value !== 'string' || !value.startsWith(prefix)) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.slice(prefix.length)
  );
}

async function writeDurableFile(
  filePath: string,
  content: Uint8Array
): Promise<void> {
  const handle = await open(filePath, 'wx', 0o644);
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
