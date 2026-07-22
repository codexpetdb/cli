import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

let sharp;
let strToU8;
let zipSync;

const packageRoot = path.resolve(import.meta.dirname, '..');
const temporary = await mkdtemp(path.join(tmpdir(), 'petdb-pack-'));
const sourcePackageJson = JSON.parse(
  await readFile(path.join(packageRoot, 'package.json'), 'utf8')
);

try {
  const packedTarballDirectory = process.env.PETDB_PACKED_TARBALL_DIR?.trim();
  if (!packedTarballDirectory) {
    run(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      ['pack', '--pack-destination', temporary],
      packageRoot
    );
  }
  const tarball = path.join(
    packedTarballDirectory
      ? path.resolve(packageRoot, packedTarballDirectory)
      : temporary,
    `${sourcePackageJson.name}-${sourcePackageJson.version}.tgz`
  );
  await writeFile(
    path.join(temporary, 'package.json'),
    JSON.stringify({ name: 'petdb-pack-smoke', private: true })
  );
  if (packedTarballDirectory) {
    run(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball],
      temporary
    );
  } else {
    run(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      ['add', '--prefer-offline', '--ignore-scripts', tarball],
      temporary
    );
  }

  const installedRoot = path.join(temporary, 'node_modules', 'codexpetdb');
  const dependencyBridge = path.join(
    installedRoot,
    'dist',
    'pack-smoke-dependencies.mjs'
  );
  await writeFile(
    dependencyBridge,
    "export { default as sharp } from 'sharp';\nexport { strToU8, zipSync } from 'fflate';\n"
  );
  ({ sharp, strToU8, zipSync } = await import(
    pathToFileURL(dependencyBridge).href
  ));
  const packageJson = JSON.parse(
    await readFile(path.join(installedRoot, 'package.json'), 'utf8')
  );
  if (packageJson.bin?.petdb !== 'dist/cli.js') {
    throw new Error('Packed package does not expose the petdb binary.');
  }
  for (const includedDocument of [
    'CHANGELOG.md',
    'CHANGELOG.zh-CN.md',
    'README.md',
    'README.zh-CN.md',
  ]) {
    if (!(await fileExists(path.join(installedRoot, includedDocument)))) {
      throw new Error(`Packed package is missing ${includedDocument}.`);
    }
  }
  for (const forbidden of [
    path.join(installedRoot, 'contracts'),
    path.join(installedRoot, 'openapi-ts.config.mjs'),
    path.join(installedRoot, 'src', 'generated'),
  ]) {
    if (await fileExists(forbidden)) {
      throw new Error(
        `Packed package contains forbidden contract source: ${forbidden}`
      );
    }
  }
  if (packageJson.exports !== undefined) {
    throw new Error('Packed package must not expose generated SDK subpaths.');
  }

  const cli = path.join(installedRoot, 'dist', 'cli.js');
  const version = run(
    process.execPath,
    [cli, 'version'],
    temporary
  ).stdout.trim();
  if (version !== packageJson.version) {
    throw new Error(`Packed CLI version mismatch: ${version}`);
  }
  const help = run(process.execPath, [cli, 'help'], temporary).stdout;
  for (const command of [
    'petdb list',
    'petdb install <pet-slug>',
    'petdb install --collection <collection-slug>',
    'petdb login',
    'petdb logout [--local-only]',
    'petdb whoami',
    'petdb submit <path> [--yes]',
    'petdb edit <slug> [editing options]',
  ]) {
    if (!help.includes(command)) {
      throw new Error(`Packed CLI help is missing: ${command}`);
    }
  }
  if (help.includes('petdb add')) {
    throw new Error('Packed CLI help still exposes the removed add command.');
  }
  const sharpSmoke = path.join(temporary, 'sharp-smoke');
  await mkdir(sharpSmoke);
  await Promise.all([
    writeFile(
      path.join(sharpSmoke, 'pet.json'),
      JSON.stringify({
        description: 'Pack smoke fixture',
        displayName: 'Pack smoke fixture',
        id: 'pack-smoke-fixture',
        spritesheetPath: 'spritesheet.webp',
      })
    ),
    writeFile(
      path.join(sharpSmoke, 'spritesheet.webp'),
      await sharp({
        create: {
          background: { alpha: 0, b: 0, g: 0, r: 0 },
          channels: 4,
          height: 1872,
          width: 1536,
        },
      })
        .webp()
        .toBuffer()
    ),
  ]);
  const installedPetSource = await import(
    pathToFileURL(path.join(installedRoot, 'dist', 'pet-source.js')).href
  );
  const prepared = await installedPetSource.prepareDirectorySource(sharpSmoke);
  const posterMetadata = await sharp(prepared.posterBytes).metadata();
  if (
    posterMetadata.format !== 'webp' ||
    posterMetadata.width !== 192 ||
    posterMetadata.height !== 208
  ) {
    throw new Error('Packed sharp runtime did not generate poster.webp.');
  }

  const pets = new Map([
    [
      'boba',
      petFixture(
        'boba',
        '0197c001-7c00-7000-8000-000000000001',
        new Uint8Array([1, 2, 3, 4]),
        'spritesheet.png'
      ),
    ],
    [
      'luna',
      petFixture(
        'luna',
        '0197c001-7c00-7000-8000-000000000002',
        new Uint8Array([5, 6, 7, 8]),
        'spritesheet.webp'
      ),
    ],
  ]);
  const requestCounts = new Map();
  const server = createServer((request, response) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    increment(requestCounts, `${request.method} ${request.url}`);
    if (request.url === '/.well-known/codexpetdb.json') {
      json(response, {
        api: {
          baseUrl: `${origin}/api/v1/pub`,
          currentVersion: 'v1',
          supportedVersions: ['v1'],
        },
        assets: { delivery: 'proxy', origin },
        catalogUrl: storageUrl(origin, 'catalogs/v1/pets.json'),
        collectionCatalogUrl: storageUrl(
          origin,
          'catalogs/v1/collections.json'
        ),
        cli: {
          binary: 'petdb',
          minVersion: '1.0.0',
          packageName: 'codexpetdb',
        },
        docsUrl: `${origin}/en/docs`,
        product: 'CodexPetDB',
        schemaVersion: 1,
        siteUrl: origin,
      });
      return;
    }
    const reportMatch = request.url?.match(
      /^\/api\/v1\/pub\/pets\/([^/]+)\/installs$/u
    );
    if (request.method === 'POST' && reportMatch && pets.has(reportMatch[1])) {
      response.statusCode = 204;
      response.end();
      return;
    }
    const key = storageKey(request.url);
    if (key === 'catalogs/v1/pets.json') {
      json(response, catalogFixture(origin, pets));
      return;
    }
    if (key === 'catalogs/v1/collections.json') {
      json(response, collectionCatalogFixture(pets));
      return;
    }
    const packageMatch = key?.match(
      /^revisions\/([0-9a-f-]{36})\/([A-Za-z0-9._~*-]+)\.zip$/u
    );
    const fixture = packageMatch ? pets.get(packageMatch[2]) : undefined;
    if (fixture && packageMatch?.[1] === fixture.revisionId) {
      response.setHeader('Content-Length', String(fixture.archive.byteLength));
      response.setHeader('Content-Type', 'application/zip');
      response.end(fixture.archive);
      return;
    }
    response.statusCode = 404;
    response.end();
  });
  await listen(server);
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const env = (codexHome) => ({
      ...process.env,
      CODEX_HOME: codexHome,
      PETDB_SITE_URL: origin,
    });

    const list = await runAsync(
      process.execPath,
      [cli, 'list'],
      temporary,
      env(path.join(temporary, 'list-home'))
    );
    for (const expected of [
      'CodexPetDB pets (2)',
      'boba\tBoba\tby CodexPetDB',
      'luna\tLuna\tby CodexPetDB',
      'petdb install <pet-slug>',
    ]) {
      if (!list.stdout.includes(expected)) {
        throw new Error(`Packed CLI list output is missing: ${expected}`);
      }
    }

    const singleHome = path.join(temporary, 'single-home');
    const install = await runAsync(
      process.execPath,
      [cli, 'install', 'boba'],
      temporary,
      env(singleHome)
    );
    await assertInstalled(singleHome, pets.get('boba'));
    if (!install.stdout.includes("Installed 'boba' (revision 1,")) {
      throw new Error('Packed CLI install output is missing its summary.');
    }

    const collectionHome = path.join(temporary, 'collection-home');
    const before = snapshotCounts(requestCounts);
    const collection = await runAsync(
      process.execPath,
      [cli, 'install', '--collection', 'cozy-friends'],
      temporary,
      env(collectionHome)
    );
    assertCountDelta(
      requestCounts,
      before,
      'GET /.well-known/codexpetdb.json',
      1
    );
    assertCountDelta(
      requestCounts,
      before,
      `GET /api/storage/file?key=${encodeURIComponent('catalogs/v1/pets.json')}`,
      1
    );
    assertCountDelta(
      requestCounts,
      before,
      `GET /api/storage/file?key=${encodeURIComponent('catalogs/v1/collections.json')}`,
      1
    );
    for (const fixture of pets.values()) {
      await assertInstalled(collectionHome, fixture);
    }
    if (
      !collection.stdout.includes(
        "Installed collection 'cozy-friends' (2 pets)."
      )
    ) {
      throw new Error('Packed CLI collection output is missing its summary.');
    }
    for (const slug of pets.keys()) {
      const reports = [...requestCounts.entries()]
        .filter(([key]) => key === `POST /api/v1/pub/pets/${slug}/installs`)
        .reduce((total, [, count]) => total + count, 0);
      if (reports < 1) {
        throw new Error(`Packed CLI did not report installation for ${slug}.`);
      }
    }
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
  console.log(`Packed, installed, and smoke-tested codexpetdb ${version}.`);
} finally {
  try {
    await rm(temporary, { force: true, recursive: true });
  } catch (error) {
    if (process.platform !== 'win32' || error?.code !== 'EPERM') {
      console.error(error);
      process.exitCode = 1;
    }
  }
}

function petFixture(slug, revisionId, sprite, spritesheetFile) {
  const archive = zipSync({
    'pet.json': strToU8(
      JSON.stringify({ id: slug, spritesheetPath: spritesheetFile })
    ),
    [spritesheetFile]: sprite,
  });
  const sha256 = createHash('sha256').update(archive).digest('hex');
  return { archive, revisionId, sha256, slug, sprite, spritesheetFile };
}

function catalogFixture(origin, pets) {
  return {
    assetBase: `${origin}/`,
    generatedAt: '2026-07-19T00:00:00.000Z',
    pets: [...pets.values()].map((pet) => ({
      assets: {
        byteSize: {
          manifest: 1,
          package: pet.archive.byteLength,
          poster: 1,
          spritesheet: pet.sprite.byteLength,
        },
        prefix: `revisions/${pet.revisionId}/`,
        sha256: {
          manifest: '1'.repeat(64),
          package: pet.sha256,
          poster: '2'.repeat(64),
          spritesheet: '3'.repeat(64),
        },
        spritesheetFile: pet.spritesheetFile,
      },
      author: 'CodexPetDB',
      displayName: pet.slug[0].toUpperCase() + pet.slug.slice(1),
      kind: 'creature',
      revision: { id: pet.revisionId, number: 1 },
      slug: pet.slug,
    })),
    schemaVersion: 1,
    total: pets.size,
  };
}

function collectionCatalogFixture(pets) {
  return {
    collections: [
      {
        name: 'Cozy friends',
        petSlugs: [...pets.keys()],
        slug: 'cozy-friends',
      },
    ],
    generatedAt: '2026-07-19T00:00:00.000Z',
    schemaVersion: 1,
    total: 1,
  };
}

async function assertInstalled(codexHome, fixture) {
  const directory = path.join(codexHome, 'pets', fixture.slug);
  const manifest = JSON.parse(
    await readFile(path.join(directory, 'pet.json'), 'utf8')
  );
  const sprite = await readFile(path.join(directory, fixture.spritesheetFile));
  if (
    manifest.id !== fixture.slug ||
    !sprite.equals(Buffer.from(fixture.sprite))
  ) {
    throw new Error(
      `Packed CLI installed incorrect files for ${fixture.slug}.`
    );
  }
}

function storageUrl(origin, key) {
  return `${origin}/api/storage/file?key=${encodeURIComponent(key)}`;
}

function storageKey(url) {
  if (!url) return null;
  const parsed = new URL(url, 'http://localhost');
  return parsed.pathname === '/api/storage/file'
    ? parsed.searchParams.get('key')
    : null;
}

function json(response, value) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}

function increment(counts, key) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function snapshotCounts(counts) {
  return new Map(counts);
}

function assertCountDelta(counts, before, key, expected) {
  const delta = (counts.get(key) ?? 0) - (before.get(key) ?? 0);
  if (delta !== expected) {
    throw new Error(
      `${key} expected ${expected} request(s), received ${delta}.`
    );
  }
}

async function fileExists(file) {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`
    );
  }
  return result;
}

function runAsync(command, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stderr, stdout });
      else
        reject(
          new Error(
            `${command} ${args.join(' ')} failed (${code}):\n${stdout}\n${stderr}`
          )
        );
    });
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
}
