import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2).filter((argument) => argument !== '--');
const dryRun = args.includes('--dry-run');
const unknown = args.filter((argument) => argument !== '--dry-run');
if (unknown.length > 0) {
  throw new Error(`Unknown option: ${unknown.join(' ')}`);
}

const packageJson = JSON.parse(
  await readFile(path.join(root, 'package.json'), 'utf8')
);
const release = `${packageJson.name}@${packageJson.version}`;
const tag = `v${packageJson.version}`;

assertCleanWorktree();
run('git', ['fetch', 'origin', '+refs/heads/main:refs/remotes/origin/main']);
const head = output('git', ['rev-parse', 'HEAD']);
const remoteMain = output('git', ['rev-parse', 'origin/main']);
const tagCommit = remoteAnnotatedTagCommit(tag);
if (head !== remoteMain) {
  throw new Error('HEAD must equal origin/main before publishing.');
}
if (head !== tagCommit) {
  throw new Error(`${tag} must exist on the remote and point to HEAD.`);
}
run('gh', ['auth', 'status']);
assertNpmVersionAvailable(release);

for (const script of ['check', 'typecheck', 'test', 'build', 'pack:smoke']) {
  run(pnpm(), [script]);
}

console.log(
  JSON.stringify(
    {
      dryRun,
      package: release,
      publishWorkflow: 'publish.yml',
      repository: packageJson.repository?.url,
      tag,
    },
    null,
    2
  )
);
if (dryRun) process.exit(0);

const prompt = createInterface({
  input: process.stdin,
  output: process.stdout,
});
try {
  const confirmation = await prompt.question(
    `Type ${release} to dispatch the npm publish workflow: `
  );
  if (confirmation !== release) {
    throw new Error('Publication confirmation did not match.');
  }
} finally {
  prompt.close();
}

const existingRunIds = new Set(
  listWorkflowRuns()
    .filter((workflowRun) => workflowRun.headSha === head)
    .map((workflowRun) => String(workflowRun.databaseId))
);
const correlation = randomUUID();
run('gh', [
  'workflow',
  'run',
  'publish.yml',
  '--ref',
  tag,
  '--field',
  `tag=${tag}`,
  '--field',
  `correlation=${correlation}`,
]);
const runId = await findWorkflowRun(head, correlation, existingRunIds);
run('gh', ['run', 'watch', runId, '--exit-status']);

function assertCleanWorktree() {
  if (output('git', ['status', '--porcelain']) !== '') {
    throw new Error('The CLI worktree must be clean before publishing.');
  }
}

function assertNpmVersionAvailable(specifier) {
  const result = execute('npm', ['view', specifier, 'version', '--json']);
  if (result.status === 0) {
    throw new Error(`${specifier} is already published.`);
  }
  const message = `${result.stdout}\n${result.stderr}`;
  if (!/E404|404 Not Found/iu.test(message)) {
    throw new Error(`Unable to verify npm availability:\n${message}`);
  }
}

function remoteAnnotatedTagCommit(releaseTag) {
  const result = execute('git', [
    'ls-remote',
    '--tags',
    'origin',
    `refs/tags/${releaseTag}`,
    `refs/tags/${releaseTag}^{}`,
  ]);
  if (result.status !== 0)
    fail('git', ['ls-remote', '--tags', 'origin'], result);
  const references = new Map(
    result.stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split(/\s+/u).reverse())
  );
  const direct = references.get(`refs/tags/${releaseTag}`);
  const peeled = references.get(`refs/tags/${releaseTag}^{}`);
  if (!direct || !peeled || direct === peeled) {
    throw new Error(`${releaseTag} must be an annotated tag on origin.`);
  }
  return peeled;
}

async function findWorkflowRun(commit, correlation, existingRunIds) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const workflowRun = listWorkflowRuns().find(
      (candidate) =>
        candidate.headSha === commit &&
        candidate.displayTitle === `Publish ${tag} (${correlation})` &&
        !existingRunIds.has(String(candidate.databaseId))
    );
    if (workflowRun) return String(workflowRun.databaseId);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error('The dispatched publish workflow did not appear in time.');
}

function listWorkflowRuns() {
  const result = execute('gh', [
    'run',
    'list',
    '--workflow',
    'publish.yml',
    '--event',
    'workflow_dispatch',
    '--limit',
    '100',
    '--json',
    'databaseId,displayTitle,headSha',
  ]);
  if (result.status !== 0) fail('gh', ['run', 'list'], result);
  return JSON.parse(result.stdout);
}

function output(command, args) {
  const result = execute(command, args);
  if (result.status !== 0) fail(command, args, result);
  return result.stdout.trim();
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed.`);
  }
}

function execute(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return result;
}

function fail(command, args, result) {
  throw new Error(
    `${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`
  );
}

function pnpm() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}
