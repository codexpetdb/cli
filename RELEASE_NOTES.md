# codexpetdb v1.1.0

This release expands `petdb` from an installer into an authenticated
contribution CLI while preserving the verified catalog and package installation
flow from v1.0.0.

## Highlights

- Sign in through a browser-approved device flow with `petdb login`, inspect
  the session with `petdb whoami`, and revoke it with `petdb logout`.
- Submit new pets from directories, root-level ZIP files, or a batch directory
  with `petdb submit`.
- Edit owned pets with text, manifest, PNG/WebP spritesheet, or ZIP inputs using
  `petdb edit`.
- Keep the active revision online during review. A successful edit creates a
  pending revision, and a newer edit safely replaces an older pending revision
  only after finalization.
- Diagnose API failures with global `--debug` output containing the HTTP status
  and a redacted, size-limited response.

## Asset support

- PNG and WebP spritesheets.
- V1 `1536×1872` and V2 `1536×2288` layouts.
- Local manifest, image signature, alpha, size, archive, and traversal checks.
- `sharp`-generated `192×208` quality-90 `poster.webp` previews.

## Security and reliability

- Site-isolated credentials use the OS Keychain when available and a
  permission-restricted file fallback otherwise.
- Bearer credentials are never forwarded to external presigned upload targets.
- API requests use explicit timeouts, reject redirects, validate response
  content types, and map Problem JSON into stable CLI exit codes.
- The CLI uses an internal SDK generated from a dedicated OpenAPI contract;
  neither the contract nor the SDK is exposed as a public npm package API.

## Install or upgrade

Node.js 20 or newer is required.

```sh
npm install --global codexpetdb@1.1.0
petdb version
```

See the
[complete changelog](https://github.com/codexpetdb/cli/blob/v1.1.0/CHANGELOG.md)
and [full command reference](https://github.com/codexpetdb/cli/blob/v1.1.0/README.md).
