import { extractAndValidatePet } from './archive.js';
import { downloadCollectionManifest } from './collection.js';
import {
  DEFAULT_SITE_URL,
  type CatalogPet,
  type DiscoveredApi,
  discoverApi,
  downloadCatalog,
  downloadInstallPackage,
  findCatalogPet,
  reportInstall,
} from './discovery.js';
import { CliError, ExitCode, type ExitCodeValue } from './errors.js';
import { installPetFiles, recoverInstall } from './install.js';
import { assertCollectionId, assertPetId } from './pet-id.js';
import { resolvePetDirectory } from './paths.js';
import { CLI_VERSION } from './version.js';

const HELP = `petdb - install verified Codex pets

Usage:
  petdb list
  petdb install <pet-slug>
  petdb install --collection <collection-slug>
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
  catalog?: typeof downloadCatalog;
  collectionManifest?: typeof downloadCollectionManifest;
  discover?: typeof discoverApi;
  download?: typeof downloadInstallPackage;
  install?: typeof installPetFiles;
  recover?: typeof recoverInstall;
  report?: typeof reportInstall;
  version?: string;
}

export async function run(
  args: string[],
  dependencies: AppDependencies = {
    stderr: process.stderr,
    stdout: process.stdout,
  }
): Promise<ExitCodeValue> {
  try {
    const [command, ...rest] = args;
    if (
      !command ||
      command === 'help' ||
      command === '--help' ||
      command === '-h'
    ) {
      if (rest.length > 0) throw usageError('help does not accept arguments.');
      dependencies.stdout.write(HELP);
      return ExitCode.Success;
    }
    if (command === 'version' || command === '--version' || command === '-v') {
      if (rest.length > 0)
        throw usageError('version does not accept arguments.');
      dependencies.stdout.write(`${dependencies.version ?? CLI_VERSION}\n`);
      return ExitCode.Success;
    }
    if (command === 'list') {
      if (rest.length > 0) throw usageError('list does not accept arguments.');
      await listPets(dependencies);
      return ExitCode.Success;
    }
    if (command !== 'install')
      throw usageError(`Unknown command '${command}'.`);

    if (rest[0] === '--collection') {
      if (rest.length !== 2) {
        throw usageError('install --collection requires one collection slug.');
      }
      await installCollection(
        assertCollectionId(rest[1] as string),
        dependencies
      );
      return ExitCode.Success;
    }
    if (rest.length !== 1)
      throw usageError('install requires exactly one pet slug.');
    const loaded = await loadCatalog(dependencies);
    await installPet(
      findCatalogPet(loaded.catalog, assertPetId(rest[0] as string)),
      loaded.discoveredApi,
      dependencies
    );
    return ExitCode.Success;
  } catch (error) {
    const normalized = normalizeError(error);
    dependencies.stderr.write(`petdb: ${normalized.message}\n`);
    return normalized.exitCode;
  }
}

async function listPets(dependencies: AppDependencies): Promise<void> {
  const { catalog, discoveredApi } = await loadCatalog(dependencies);
  dependencies.stdout.write(`CodexPetDB pets (${catalog.total})\n`);
  for (const pet of catalog.pets) {
    dependencies.stdout.write(
      `${pet.slug}\t${pet.displayName}\tby ${pet.author}\n`
    );
  }
  dependencies.stdout.write(
    `\nInstall with: petdb install <pet-slug>\nBrowse: ${new URL('/gallery', discoveredApi.siteUrl).href}\n`
  );
}

async function installCollection(
  collectionSlug: string,
  dependencies: AppDependencies
): Promise<void> {
  const loaded = await loadCatalog(dependencies);
  const getManifest =
    dependencies.collectionManifest ?? downloadCollectionManifest;
  const manifest = await getManifest(collectionSlug, {
    clientVersion: dependencies.version ?? CLI_VERSION,
    discoveredApi: loaded.discoveredApi,
  });
  dependencies.stdout.write(
    `Installing collection '${collectionSlug}' (${manifest.petSlugs.length} pets).\n`
  );
  for (let index = 0; index < manifest.petSlugs.length; index += 1) {
    const slug = manifest.petSlugs[index] as string;
    try {
      await installPet(
        findCatalogPet(loaded.catalog, slug),
        loaded.discoveredApi,
        dependencies
      );
    } catch (error) {
      const normalized = normalizeError(error);
      throw new CliError(
        `Collection '${collectionSlug}' stopped after ${index} of ${manifest.petSlugs.length} pets while installing '${slug}': ${normalized.message}`,
        normalized.exitCode,
        { cause: error }
      );
    }
  }
  dependencies.stdout.write(
    `Installed collection '${collectionSlug}' (${manifest.petSlugs.length} pets).\n`
  );
}

async function loadCatalog(dependencies: AppDependencies) {
  const clientVersion = dependencies.version ?? CLI_VERSION;
  const siteUrl = process.env.PETDB_SITE_URL ?? DEFAULT_SITE_URL;
  const discover = dependencies.discover ?? discoverApi;
  const discoveredApi = await discover(siteUrl, { clientVersion });
  const getCatalog = dependencies.catalog ?? downloadCatalog;
  return await getCatalog({ clientVersion, discoveredApi });
}

async function installPet(
  pet: CatalogPet,
  discoveredApi: DiscoveredApi,
  dependencies: AppDependencies
): Promise<void> {
  const target = resolvePetDirectory(pet.slug);
  await (dependencies.recover ?? recoverInstall)(target);
  const archive = await (dependencies.download ?? downloadInstallPackage)(pet, {
    clientVersion: dependencies.version ?? CLI_VERSION,
    discoveredApi,
  });
  const files = extractAndValidatePet(archive.bytes, pet.slug);
  await (dependencies.install ?? installPetFiles)(target, files);
  dependencies.stdout.write(
    `Installed '${pet.slug}' (revision ${archive.metadata.revisionNumber}, ${archive.metadata.revisionId}) to ${target}\n`
  );
  await (dependencies.report ?? reportInstall)(pet.slug, discoveredApi, {
    clientVersion: dependencies.version ?? CLI_VERSION,
  });
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
