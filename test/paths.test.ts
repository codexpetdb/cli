import { describe, expect, it } from 'vitest';
import { resolveCodexHome, resolvePetDirectory } from '../src/paths.js';

describe('Codex paths', () => {
  it('uses the macOS home directory default', () => {
    expect(
      resolvePetDirectory('sleepy-fox', {
        env: {},
        homeDir: '/Users/pet',
        platform: 'darwin',
      })
    ).toBe('/Users/pet/.codex/pets/sleepy-fox');
  });

  it('uses the Linux home directory default', () => {
    expect(
      resolveCodexHome({
        env: {},
        homeDir: '/home/pet',
        platform: 'linux',
      })
    ).toBe('/home/pet/.codex');
  });

  it('uses Windows path semantics', () => {
    expect(
      resolvePetDirectory('sleepy-fox', {
        env: {},
        homeDir: 'C:\\Users\\Pet',
        platform: 'win32',
      })
    ).toBe('C:\\Users\\Pet\\.codex\\pets\\sleepy-fox');
  });

  it('honors CODEX_HOME with platform-specific resolution', () => {
    expect(
      resolveCodexHome({
        env: { CODEX_HOME: 'D:\\Codex' },
        homeDir: 'C:\\Users\\Pet',
        platform: 'win32',
      })
    ).toBe('D:\\Codex');
  });
});
