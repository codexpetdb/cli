import { homedir } from 'node:os';
import path from 'node:path';

type SupportedPlatform = 'darwin' | 'linux' | 'win32';

interface CodexHomeOptions {
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
  platform?: NodeJS.Platform;
}

export function resolveCodexHome(options: CodexHomeOptions = {}): string {
  const platform = normalizePlatform(options.platform ?? process.platform);
  const pathApi = platform === 'win32' ? path.win32 : path.posix;
  const configured = options.env?.CODEX_HOME ?? process.env.CODEX_HOME;
  if (configured?.trim()) return pathApi.resolve(configured.trim());
  return pathApi.join(options.homeDir ?? homedir(), '.codex');
}

export function resolvePetDirectory(
  petId: string,
  options: CodexHomeOptions = {}
): string {
  const platform = normalizePlatform(options.platform ?? process.platform);
  const pathApi = platform === 'win32' ? path.win32 : path.posix;
  return pathApi.join(resolveCodexHome(options), 'pets', petId);
}

function normalizePlatform(platform: NodeJS.Platform): SupportedPlatform {
  return platform === 'win32'
    ? 'win32'
    : platform === 'darwin'
      ? 'darwin'
      : 'linux';
}
