import { describe, expect, it } from 'vitest';
import { type CliError, ExitCode } from '../src/errors.js';
import { assertPetId } from '../src/pet-id.js';

describe('assertPetId', () => {
  it.each([
    'cat',
    'doraemon-1',
    'Doraemon_1',
    'pet*1',
    'a'.repeat(32),
  ])('accepts %s', (value) => {
    expect(assertPetId(value)).toBe(value);
  });

  it.each([
    'ab',
    'a'.repeat(33),
    'sleepy fox',
    'sleepy/fox',
    'sleepy%20fox',
    '哆啦A梦-1',
  ])('rejects %s with usage exit code', (value) => {
    expect(() => assertPetId(value)).toThrowError(
      expect.objectContaining<Partial<CliError>>({ exitCode: ExitCode.Usage })
    );
  });
});
