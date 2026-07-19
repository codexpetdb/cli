import { CliError, ExitCode } from './errors.js';

const PET_ID_PATTERN = /^[A-Za-z0-9._~*-]+$/;
const PET_ID_MIN_LENGTH = 3;
const PET_ID_MAX_LENGTH = 32;
const COLLECTION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertPetId(value: string): string {
  if (!isPublicId(value)) {
    throw new CliError(
      'Pet id must be 3-32 URL-safe letters, numbers, or - . _ ~ * characters.',
      ExitCode.Usage
    );
  }

  return value;
}

export function assertCollectionId(value: string): string {
  if (
    value.length < 3 ||
    value.length > 64 ||
    !COLLECTION_SLUG_PATTERN.test(value)
  ) {
    throw new CliError(
      'Collection slug must be 3-64 lowercase letters, numbers, or hyphens.',
      ExitCode.Usage
    );
  }
  return value;
}

export function isPublicId(value: string): boolean {
  return (
    value.length >= PET_ID_MIN_LENGTH &&
    value.length <= PET_ID_MAX_LENGTH &&
    PET_ID_PATTERN.test(value)
  );
}
