import { extractAndValidatePet } from './archive.js';
import {
  downloadCollectionCatalog,
  findCatalogCollection,
} from './collection.js';
import {
  editCommand,
  type EditOptions,
  loginCommand,
  logoutCommand,
  submitCommand,
  whoamiCommand,
} from './commands.js';
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
import {
  CliError,
  ExitCode,
  type ExitCodeValue,
  findHttpDebugInfo,
} from './errors.js';
import { installPetFiles, recoverInstall } from './install.js';
import { assertCollectionId, assertPetId } from './pet-id.js';
import { resolvePetDirectory } from './paths.js';
import { CLI_VERSION } from './version.js';

const HELP = `petdb - manage and install verified Codex pets

Usage:
  petdb [--debug] <command>
  petdb list
  petdb install <pet-slug>
  petdb install --collection <collection-slug>
  petdb login
  petdb logout [--local-only]
  petdb whoami
  petdb submit <path> [--yes]
  petdb edit <slug> [editing options]
  petdb help
  petdb version

Editing options:
  --description <text>
  --display-name <name>
  --manifest <path>
  --spritesheet <path>
  --zip <path>

Global options:
  --debug          Print HTTP status and redacted response for API failures

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
  collectionCatalog?: typeof downloadCollectionCatalog;
  discover?: typeof discoverApi;
  download?: typeof downloadInstallPackage;
  install?: typeof installPetFiles;
  recover?: typeof recoverInstall;
  report?: typeof reportInstall;
  edit?: typeof editCommand;
  login?: typeof loginCommand;
  logout?: typeof logoutCommand;
  submit?: typeof submitCommand;
  version?: string;
  whoami?: typeof whoamiCommand;
}

export async function run(
  args: string[],
  dependencies: AppDependencies = {
    stderr: process.stderr,
    stdout: process.stdout,
  }
): Promise<ExitCodeValue> {
  let debug = false;
  try {
    const parsed = parseGlobalOptions(args);
    debug = parsed.debug;
    const [command, ...rest] = parsed.args;
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
    if (command === 'login') {
      if (rest.length > 0) throw usageError('login does not accept arguments.');
      await (dependencies.login ?? loginCommand)(dependencies);
      return ExitCode.Success;
    }
    if (command === 'logout') {
      if (rest.length > 1 || (rest[0] && rest[0] !== '--local-only')) {
        throw usageError('logout accepts only --local-only.');
      }
      await (dependencies.logout ?? logoutCommand)(
        dependencies,
        rest[0] === '--local-only'
      );
      return ExitCode.Success;
    }
    if (command === 'whoami') {
      if (rest.length > 0)
        throw usageError('whoami does not accept arguments.');
      await (dependencies.whoami ?? whoamiCommand)(dependencies);
      return ExitCode.Success;
    }
    if (command === 'submit') {
      const parsed = parseSubmitArgs(rest);
      await (dependencies.submit ?? submitCommand)(
        parsed.path,
        {
          interactive: process.stdin.isTTY === true,
          yes: parsed.yes,
        },
        dependencies
      );
      return ExitCode.Success;
    }
    if (command === 'edit') {
      const parsed = parseEditArgs(rest);
      await (dependencies.edit ?? editCommand)(
        parsed.slug,
        parsed.options,
        dependencies
      );
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
    const http = debug ? findHttpDebugInfo(normalized) : undefined;
    if (http) {
      dependencies.stderr.write(`petdb debug: HTTP ${http.status}\n`);
      dependencies.stderr.write(`petdb debug: response: ${http.response}\n`);
    }
    return normalized.exitCode;
  }
}

function parseGlobalOptions(args: string[]): {
  args: string[];
  debug: boolean;
} {
  const debugCount = args.filter((argument) => argument === '--debug').length;
  if (debugCount > 1) throw usageError('--debug may be provided only once.');
  return {
    args: args.filter((argument) => argument !== '--debug'),
    debug: debugCount === 1,
  };
}

function parseSubmitArgs(args: string[]): { path: string; yes: boolean } {
  const positional = args.filter((argument) => argument !== '--yes');
  const yesCount = args.length - positional.length;
  if (positional.length !== 1 || yesCount > 1) {
    throw usageError('submit requires one path and accepts --yes once.');
  }
  return { path: positional[0] as string, yes: yesCount === 1 };
}

function parseEditArgs(args: string[]): { options: EditOptions; slug: string } {
  const slug = args[0];
  if (!slug || slug.startsWith('--')) {
    throw usageError('edit requires one pet slug.');
  }
  const options: EditOptions = {};
  const optionMap = {
    '--description': 'description',
    '--display-name': 'displayName',
    '--manifest': 'manifestPath',
    '--spritesheet': 'spritesheetPath',
    '--zip': 'zipPath',
  } as const;
  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index] as keyof typeof optionMap;
    const value = args[index + 1];
    const key = optionMap[flag];
    if (!key || !value || value.startsWith('--')) {
      throw usageError(`Invalid edit option '${args[index] ?? ''}'.`);
    }
    if (options[key] !== undefined) {
      throw usageError(`Edit option '${flag}' was provided more than once.`);
    }
    options[key] = value;
  }
  if (Object.keys(options).length === 0) {
    throw usageError('edit requires at least one editing option.');
  }
  if (options.zipPath && (options.manifestPath || options.spritesheetPath)) {
    throw usageError(
      '--zip cannot be combined with --manifest or --spritesheet.'
    );
  }
  return { options, slug };
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
  const clientVersion = dependencies.version ?? CLI_VERSION;
  const siteUrl = process.env.PETDB_SITE_URL ?? DEFAULT_SITE_URL;
  const discover = dependencies.discover ?? discoverApi;
  const discoveredApi = await discover(siteUrl, { clientVersion });
  const [petResult, collectionResult] = await Promise.all([
    (dependencies.catalog ?? downloadCatalog)({
      clientVersion,
      discoveredApi,
    }),
    (dependencies.collectionCatalog ?? downloadCollectionCatalog)({
      clientVersion,
      discoveredApi,
    }),
  ]);
  const collection = findCatalogCollection(
    collectionResult.catalog,
    collectionSlug
  );
  const pets = collection.petSlugs.map((slug) => {
    const pet = petResult.catalog.pets.find(
      (candidate) => candidate.slug === slug
    );
    if (!pet) {
      throw new CliError(
        `Collection '${collectionSlug}' references Pet '${slug}', but it is unavailable in pets.json. The catalogs may be updating; retry later.`,
        ExitCode.Integrity
      );
    }
    return pet;
  });
  dependencies.stdout.write(
    `Installing collection '${collectionSlug}' (${pets.length} pets).\n`
  );
  for (let index = 0; index < pets.length; index += 1) {
    const pet = pets[index] as CatalogPet;
    try {
      await installPet(pet, discoveredApi, dependencies);
    } catch (error) {
      const normalized = normalizeError(error);
      throw new CliError(
        `Collection '${collectionSlug}' stopped after ${index} of ${pets.length} pets while installing '${pet.slug}': ${normalized.message}`,
        normalized.exitCode,
        { cause: error }
      );
    }
  }
  dependencies.stdout.write(
    `Installed collection '${collectionSlug}' (${pets.length} pets).\n`
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
