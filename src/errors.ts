export const ExitCode = {
  Success: 0,
  Usage: 2,
  Network: 3,
  Integrity: 4,
  FileSystem: 5,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

export class CliError extends Error {
  readonly exitCode: ExitCodeValue;

  constructor(
    message: string,
    exitCode: ExitCodeValue,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}
