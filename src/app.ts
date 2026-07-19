import { extractAndValidatePet } from './archive.js';
import { downloadCollectionManifest } from './collection.js';
import {
  DEFAULT_SITE_URL,
  type DiscoveredApi,
  discoverApi,
  downloadInstallPackage,
} from './discovery.js';
import { CliError, ExitCode, type ExitCodeValue } from './errors.js';
import { installPetFiles, recoverInstall } from './install.js';
import { assertCollectionId, assertPetId } from './pet-id.js';
import { resolvePetDirectory } from './paths.js';
import { CLI_VERSION } from './version.js';

const HELP = `petdb - install verified Codex pets

Usage:
  petdb add <pet-id>
  petdb add-collection <collection-slug>
  petdb help
  petdb version

Environment:
  CODEX_HOME       Codex home directory (default: ~/.codex)
  PETDB_SITE_URL   CodexPetDB site origin
`;

interface Output {
  stderr: Pick<NodeJS.WriteStream, 'write'>;
  stdout: Pick<NodeJS.WriteStream, 'write'>;
}

interface AppDependencies extends Output {
  collectionManifest?: typeof downloadCollectionManifest;
  discover?: typeof discoverApi;
  download?: typeof downloadInstallPackage;
  install?: typeof installPetFiles;
  recover?: typeof recoverInstall;
  version?: string;
}

export async function run(
  args: string[],
  dependencies: AppDependencies = {
    stderr: process.stderr,
    stdout: process.stdout,
  }
): Promise<ExitCodeValue> {
  const stdout = dependencies.stdout;
  const stderr = dependencies.stderr;

  try {
    const [command, ...rest] = args;
    if (
      !command ||
      command === 'help' ||
      command === '--help' ||
      command === '-h'
    ) {
      if (rest.length > 0) throw usageError('help does not accept arguments.');
      stdout.write(HELP);
      return ExitCode.Success;
    }

    if (command === 'version' || command === '--version' || command === '-v') {
      if (rest.length > 0) {
        throw usageError('version does not accept arguments.');
      }
      stdout.write(`${dependencies.version ?? CLI_VERSION}\n`);
      return ExitCode.Success;
    }

    if (command !== 'add' && command !== 'add-collection') {
      throw usageError(`Unknown command '${command}'.`);
    }
    if (rest.length !== 1) {
      throw usageError(
        command === 'add'
          ? 'add requires exactly one pet id.'
          : 'add-collection requires exactly one collection slug.'
      );
    }

    if (command === 'add') {
      await installPet(assertPetId(rest[0] as string), dependencies);
      return ExitCode.Success;
    }

    const collectionId = assertCollectionId(rest[0] as string);
    const clientVersion = dependencies.version ?? CLI_VERSION;
    const discover = dependencies.discover ?? discoverApi;
    const discoveredApi = await discover(
      process.env.PETDB_SITE_URL ?? DEFAULT_SITE_URL,
      { clientVersion }
    );
    const getManifest =
      dependencies.collectionManifest ?? downloadCollectionManifest;
    const manifest = await getManifest(collectionId, {
      clientVersion,
      discoveredApi,
    });
    stdout.write(
      `Installing collection '${collectionId}' (${manifest.petIds.length} pets).\n`
    );
    for (let index = 0; index < manifest.petIds.length; index += 1) {
      const petId = manifest.petIds[index] as string;
      try {
        await installPet(petId, dependencies, discoveredApi);
      } catch (error) {
        const normalized = normalizeError(error);
        throw new CliError(
          `Collection '${collectionId}' stopped after ${index} of ${manifest.petIds.length} pets while installing '${petId}': ${normalized.message}`,
          normalized.exitCode,
          { cause: error }
        );
      }
    }
    stdout.write(
      `Installed collection '${collectionId}' (${manifest.petIds.length} pets).\n`
    );
    return ExitCode.Success;
  } catch (error) {
    const normalized = normalizeError(error);
    stderr.write(`petdb: ${normalized.message}\n`);
    return normalized.exitCode;
  }
}

async function installPet(
  petId: string,
  dependencies: AppDependencies,
  discoveredApi?: DiscoveredApi
): Promise<void> {
  const target = resolvePetDirectory(petId);
  const recover = dependencies.recover ?? recoverInstall;
  await recover(target);
  const download = dependencies.download ?? downloadInstallPackage;
  const install = dependencies.install ?? installPetFiles;
  const archive = await download(petId, {
    clientVersion: dependencies.version ?? CLI_VERSION,
    discoveredApi,
  });
  const files = extractAndValidatePet(archive.bytes, petId);
  await install(target, files);
  dependencies.stdout.write(
    `Installed '${petId}' (pet v${archive.metadata.petVersion}, revision ${archive.metadata.revisionId}) to ${target}\n`
  );
}

function usageError(message: string): CliError {
  return new CliError(
    `${message}\nRun 'petdb help' for usage.`,
    ExitCode.Usage
  );
}

function normalizeError(error: unknown): CliError {
  if (error instanceof CliError) return error;
  return new CliError(
    error instanceof Error ? error.message : String(error),
    ExitCode.FileSystem,
    { cause: error }
  );
}
