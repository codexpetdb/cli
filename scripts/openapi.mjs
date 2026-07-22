import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@hey-api/openapi-ts';

const root = path.resolve(import.meta.dirname, '..');
const input = path.join(root, 'contracts/cli-openapi.json');
const output = path.join(root, 'src/generated/cli-api');
const [action, ...options] = process.argv.slice(2);

if (!['check', 'generate'].includes(action ?? '') || options.length > 0) {
  throw new Error('Usage: openapi.mjs <generate|check>');
}

if (action === 'generate') {
  await generate(output);
  console.log('Generated src/generated/cli-api.');
} else {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), 'codexpetdb-cli-openapi-')
  );
  try {
    const generated = path.join(temporaryDirectory, 'generated');
    await generate(generated);
    await compareDirectories(generated, output);
    await assertSdkOperations(generated);
    console.log('Generated CLI SDK matches contracts/cli-openapi.json.');
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

async function generate(target) {
  await createClient({
    input,
    output: { importFileExtension: '.js', path: target },
  });
}

async function compareDirectories(expectedRoot, actualRoot) {
  const [expectedFiles, actualFiles] = await Promise.all([
    listFiles(expectedRoot),
    listFiles(actualRoot),
  ]);
  if (
    expectedFiles.length !== actualFiles.length ||
    expectedFiles.some((file, index) => file !== actualFiles[index])
  ) {
    throw new Error(
      "Generated CLI SDK file list is stale. Run 'pnpm openapi:generate'."
    );
  }
  for (const file of expectedFiles) {
    const [expected, actual] = await Promise.all([
      readFile(path.join(expectedRoot, file)),
      readFile(path.join(actualRoot, file)),
    ]);
    if (!expected.equals(actual)) {
      throw new Error(
        `Generated CLI SDK file '${file}' is stale. Run 'pnpm openapi:generate'.`
      );
    }
  }
}

async function listFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(
        ...(await listFiles(path.join(directory, entry.name), relative))
      );
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }
  return files.sort();
}

async function assertSdkOperations(directory) {
  const source = await readFile(path.join(directory, 'sdk.gen.ts'), 'utf8');
  for (const operation of [
    'abortCliPetUpload',
    'createCliDeviceCode',
    'createCliPetRevision',
    'createCliPetSubmission',
    'finalizeCliPetUpload',
    'getCliCurrentUser',
    'getCliPetEditSource',
    'pollCliDeviceToken',
    'revokeCliCurrentSession',
  ]) {
    if (!source.includes(`export const ${operation} =`)) {
      throw new Error(`Generated CLI SDK is missing '${operation}'.`);
    }
  }
}
