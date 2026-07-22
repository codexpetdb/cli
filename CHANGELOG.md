# Changelog

All notable changes to the CodexPetDB CLI are documented in this file.

## 1.1.0 - 2026-07-22

### Added

- Added `login`, `logout`, and `whoami` with browser-approved device
  authorization, site-isolated credentials, OS Keychain storage, and a
  permission-restricted file fallback.
- Added `submit` for a pet directory, a root-level ZIP, or a directory of pet
  package subdirectories. PNG and WebP spritesheets are supported.
- Added `edit` for text, manifest, spritesheet, ZIP, and combined edits. Every
  edit creates a pending revision while the active revision remains online.
- Added the global `--debug` option to print an HTTP status and redacted,
  size-limited response when an API call fails.
- Added authentication and service exit codes `6` and `7`.

### Security and reliability

- Added local validation for manifest size and fields, spritesheet signature,
  alpha support, V1/V2 dimensions, archive structure, and ZIP traversal.
- Added deterministic `poster.webp` generation with `sharp` from the
  upper-left `192×208` region at WebP quality 90.
- Added authenticated upload sessions with content declarations, idempotency,
  best-effort aborts, and server-side finalization.
- Prevented Bearer credentials from being forwarded to external presigned
  upload targets and disabled HTTP redirects in the API client.
- Added explicit timeout, Content-Type, Problem JSON, and redacted diagnostic
  handling for CLI API requests.
- Replacing an existing pending edit now happens only after the newer upload
  finalizes; failed edits preserve the previous pending revision.

### Development

- Added a CLI-only OpenAPI 3.1 contract and a committed internal SDK generated
  by `@hey-api/openapi-ts`. Neither the contract nor an SDK subpath is exposed
  by the npm package.
- Added OpenAPI drift checks and expanded command, API, credential, asset, and
  packed-package tests.
- Added packed runtime smoke coverage for `sharp` on Node.js 20 across Linux,
  macOS, and Windows CI.
- Allowed packed runtime smoke installation to fetch missing platform-specific
  optional dependencies on clean CI runners.
- Fixed hidden tarball artifact upload so Node.js 20 runtime smoke runs on the
  actual package across Linux, macOS, and Windows.
- Fixed Windows execution of npm and pnpm command shims in packed runtime
  smoke tests.
- Expanded the English and Simplified Chinese READMEs with complete command,
  validation, credential, exit-code, and release documentation.

## 1.0.0 - 2026-07-21

### Added

- Initial `petdb` release.
- Added public catalog listing with `petdb list`.
- Added verified single-pet installation with `petdb install <pet-slug>`.
- Added ordered collection installation with
  `petdb install --collection <collection-slug>`.
- Added content-length, SHA-256, package structure, and pet identity checks
  before recoverable installation.
