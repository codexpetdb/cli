import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { strToU8, zipSync } from 'fflate';

const packageRoot = path.resolve(import.meta.dirname, '..');
const temporary = await mkdtemp(path.join(tmpdir(), 'petdb-pack-'));
const sourcePackageJson = JSON.parse(
  await readFile(path.join(packageRoot, 'package.json'), 'utf8')
);

try {
  run(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['pack', '--pack-destination', temporary],
    packageRoot
  );

  const tarball = path.join(
    temporary,
    `${sourcePackageJson.name}-${sourcePackageJson.version}.tgz`
  );
  await writeFile(
    path.join(temporary, 'package.json'),
    JSON.stringify({ name: 'petdb-pack-smoke', private: true })
  );
  run(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['add', '--offline', '--ignore-scripts', tarball],
    temporary
  );

  const installedRoot = path.join(temporary, 'node_modules', 'petdb');
  const packageJson = JSON.parse(
    await readFile(path.join(installedRoot, 'package.json'), 'utf8')
  );
  if (packageJson.bin?.petdb !== 'dist/cli.js') {
    throw new Error('Packed package does not expose the petdb binary.');
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
  if (!help.includes('petdb add <pet-id>')) {
    throw new Error('Packed CLI help smoke test failed.');
  }
  if (!help.includes('petdb add-collection <collection-slug>')) {
    throw new Error('Packed CLI collection help smoke test failed.');
  }

  const pets = new Map([
    ['boba', petFixture('boba', new Uint8Array([1, 2, 3, 4]))],
    ['luna', petFixture('luna', new Uint8Array([5, 6, 7, 8]))],
  ]);
  let discoveryRequests = 0;
  const server = createServer((request, response) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (request.url === '/.well-known/codexpetdb.json') {
      discoveryRequests += 1;
      response.setHeader('Content-Type', 'application/json');
      response.end(
        JSON.stringify({
          schemaVersion: 1,
          product: 'CodexPetDB',
          siteUrl: origin,
          api: {
            currentVersion: 'v1',
            supportedVersions: ['v1'],
            baseUrl: `${origin}/api/v1/pub`,
            openApiUrl: `${origin}/api/storage/file?key=${encodeURIComponent('contracts/public/v1.0.0/openapi.json')}`,
          },
          assets: { origin },
          catalogUrl: `${origin}/api/v1/pub/pet-catalog`,
          docsUrl: `${origin}/en/docs`,
          cli: {
            binary: 'petdb',
            minVersion: '1.0.0',
            packageName: 'petdb',
          },
        })
      );
      return;
    }
    if (request.url === '/api/v1/pub/collections/cozy-friends/manifest') {
      response.setHeader('Content-Type', 'application/json');
      response.end(
        JSON.stringify({
          collectionId: 'cozy-friends',
          collectionSlug: 'cozy-friends',
          pets: [...pets.keys()].map((id) => ({
            id,
            package: `${origin}/assets/${id}.zip`,
          })),
          schemaVersion: 1,
        })
      );
      return;
    }
    const installMatch = request.url?.match(
      /^\/api\/v1\/pub\/pets\/([^/]+)\/install\?client=petdb$/
    );
    const installPet = installMatch ? pets.get(installMatch[1]) : undefined;
    if (installMatch && installPet) {
      const id = installMatch[1];
      response.setHeader('Content-Type', 'application/json');
      response.end(
        JSON.stringify({
          data: {
            formatVersion: 2,
            package: {
              byteSize: installPet.archive.byteLength,
              contentType: 'application/zip',
              filename: `${id}.zip`,
              sha256: installPet.sha256,
              url: `${origin}/assets/${id}.zip`,
            },
            petId: id,
            revisionId: '0197c001-7c00-7000-8000-000000000001',
          },
          meta: { requestId: 'pack-smoke' },
        })
      );
      return;
    }
    const assetMatch = request.url?.match(/^\/assets\/([^/]+)\.zip$/);
    const assetPet = assetMatch ? pets.get(assetMatch[1]) : undefined;
    if (assetPet) {
      response.setHeader('Content-Length', String(assetPet.archive.byteLength));
      response.setHeader('Content-Type', 'application/zip');
      response.end(assetPet.archive);
      return;
    }
    response.statusCode = 404;
    response.end();
  });
  await listen(server);
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const codexHome = path.join(temporary, 'codex-home');
    const add = await runAsync(
      process.execPath,
      [cli, 'add', 'boba'],
      temporary,
      {
        ...process.env,
        CODEX_HOME: codexHome,
        PETDB_SITE_URL: origin,
      }
    );
    const petDirectory = path.join(codexHome, 'pets', 'boba');
    const manifest = JSON.parse(
      await readFile(path.join(petDirectory, 'pet.json'), 'utf8')
    );
    const sprite = await readFile(path.join(petDirectory, 'spritesheet.png'));
    if (manifest.id !== 'boba' || !sprite.equals(Buffer.from([1, 2, 3, 4]))) {
      throw new Error('Packed CLI add smoke test installed incorrect files.');
    }
    for (const expected of [
      petDirectory,
      'pet v2',
      'revision 0197c001-7c00-7000-8000-000000000001',
    ]) {
      if (!add.stdout.includes(expected)) {
        throw new Error(`Packed CLI add output is missing: ${expected}`);
      }
    }

    const collectionHome = path.join(temporary, 'collection-codex-home');
    const discoveryBeforeCollection = discoveryRequests;
    const addCollection = await runAsync(
      process.execPath,
      [cli, 'add-collection', 'cozy-friends'],
      temporary,
      {
        ...process.env,
        CODEX_HOME: collectionHome,
        PETDB_SITE_URL: origin,
      }
    );
    if (discoveryRequests - discoveryBeforeCollection !== 1) {
      throw new Error('add-collection must perform discovery exactly once.');
    }
    for (const [id, fixture] of pets) {
      const directory = path.join(collectionHome, 'pets', id);
      const installedManifest = JSON.parse(
        await readFile(path.join(directory, 'pet.json'), 'utf8')
      );
      const installedSprite = await readFile(
        path.join(directory, 'spritesheet.png')
      );
      if (
        installedManifest.id !== id ||
        !installedSprite.equals(Buffer.from(fixture.sprite))
      ) {
        throw new Error(`Packed CLI installed incorrect collection pet: ${id}`);
      }
    }
    if (!addCollection.stdout.includes("Installed collection 'cozy-friends'")) {
      throw new Error('Packed CLI collection output is missing its summary.');
    }
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
  console.log(`Packed, installed, and smoke-tested petdb ${version}.`);
} finally {
  await rm(temporary, { force: true, recursive: true });
}

function petFixture(id, sprite) {
  const archive = zipSync({
    'pet.json': strToU8(
      JSON.stringify({ id, spritesheetPath: 'spritesheet.png' })
    ),
    'spritesheet.png': sprite,
  });
  return {
    archive,
    sha256: createHash('sha256').update(archive).digest('hex'),
    sprite,
  };
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });
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
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve({ stderr, stdout });
      else
        reject(
          new Error(`${command} failed with ${code}:\n${stdout}\n${stderr}`)
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
