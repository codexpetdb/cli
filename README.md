# CodexPetDB CLI

[English](README.md) | [简体中文](README.zh-CN.md) |
[Changelog](CHANGELOG.md)

The `codexpetdb` npm package provides the `petdb` command and the equivalent
`codexpetdb` alias for discovering, installing, submitting, and editing
verified Codex pets. The database and Web application are private; this CLI is
maintained publicly for community review.

## Requirements and installation

Node.js 20 or newer is required.

```sh
npm install --global codexpetdb
petdb version
codexpetdb version
```

Commands can also be run without a global installation:

```sh
npx codexpetdb list
```

## Global usage

```text
petdb [--debug] <command>
codexpetdb [--debug] <command>
```

Both binary names run the same CLI. The examples below use the shorter
`petdb` name.

`--debug` can appear before or after the command. When an HTTP call fails, it
writes the status code and redacted response body to stderr. Sensitive fields
are removed and the response is limited to 16 KiB. Successful requests and
failures without an HTTP response do not produce an HTTP debug record.

```sh
petdb --debug submit ./my-pet --yes
petdb whoami --debug
```

The CLI reads these environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `CODEX_HOME` | Codex data directory and pet installation root | `~/.codex` |
| `PETDB_SITE_URL` | CodexPetDB HTTP(S) site origin | Production site |

`PETDB_SITE_URL` must be an origin without a path, credentials, query, or
fragment. Credentials are isolated by this origin.

## Command reference

### `petdb list`

Lists every currently available pet in catalog order.

```sh
petdb list
```

The command downloads the static Pet Catalog once and prints each pet's slug,
display name, and author. It does not install anything or require login.

### `petdb install <pet-slug>`

Installs one pet by its exact slug.

```sh
petdb install sleepy-fox
```

The pet is installed in `$CODEX_HOME/pets/<pet-slug>`, which defaults to
`~/.codex/pets/<pet-slug>`. The CLI reads site discovery and the Pet Catalog,
derives the package URL from the trusted asset origin, then verifies the
response content type, byte length, SHA-256 digest, ZIP structure, and
`pet.json.id`. Installation is recoverable if writing the destination fails.

A successful install sends a best-effort metrics request with a two-second
timeout. Metrics failures never change the command result.

### `petdb install --collection <collection-slug>`

Installs every pet in a collection in its declared order.

```sh
petdb install --collection cozy-friends
```

The command downloads the Pet and Collection catalogs once, then installs up
to 100 pets. It stops on the first failure and preserves pets already
installed, so rerunning it is safe.

### `petdb login`

Signs in through a browser-approved device authorization flow.

```sh
petdb login
```

The CLI prints a complete verification URL containing the one-time code, the
code itself, and the expiration time, then attempts to open the browser. The
URL can be copied and opened without entering the code separately. The CLI
continues polling until the request is approved, denied, expired, cancelled
with `Ctrl+C`, or fails. If the current site already has a valid credential,
`login` prints that identity instead of switching accounts; run `petdb logout`
first to use another account.

Credentials are stored in the OS Keychain when available. The fallback file is
written atomically and restricted to mode `0600` on supported Unix systems:

| Platform | Fallback credential file |
| --- | --- |
| macOS and Linux | `${XDG_CONFIG_HOME:-~/.config}/codexpetdb/credentials.json` |
| Windows | `%APPDATA%\CodexPetDB\credentials.json` |

### `petdb logout [--local-only]`

Revokes the current session and removes its local credential.

```sh
petdb logout
petdb logout --local-only
```

Without `--local-only`, the CLI revokes the server session first. A network or
service failure leaves the local credential intact so the revocation can be
retried. `--local-only` removes only the credential stored on this computer.

### `petdb whoami`

Shows the account associated with the current site credential.

```sh
petdb whoami
```

Output includes the site origin, public UID, name, email, and session expiry.
The bearer token is never printed.

### `petdb submit <path> [--yes]`

Validates and submits one or more new pets for review.

```sh
petdb submit ./my-pet
petdb submit ./my-pet.zip --yes
petdb submit ./pet-batch --yes
```

`<path>` can be one of the following:

1. A directory containing `pet.json` and its spritesheet.
2. A `.zip` file with `pet.json` and its spritesheet at the archive root.
3. A parent directory whose direct child directories are pet packages.

Batch mode scans only direct child directories containing `pet.json`; it does
not scan nested directories or child ZIP files. Each package is submitted
independently and a final success/failure summary is printed. Successful items
remain submitted if a later item fails.

In an interactive terminal, the CLI asks for confirmation unless `--yes` is
present. Non-interactive use must pass `--yes`.

The command requires login. It creates an upload session, uploads the validated
manifest, spritesheet, and generated poster, then finalizes the submission. A
failure triggers a best-effort upload abort. If the slug already belongs to the
current user, use `petdb edit`; a slug owned by someone else is a conflict. The
CLI never invents a suffix.

### `petdb edit <slug> [options]`

Creates a pending revision for a pet owned by the signed-in user.

```sh
petdb edit sleepy-fox --description "A calmer forest companion"
petdb edit sleepy-fox --display-name "Sleepy Fox"
petdb edit sleepy-fox --manifest ./pet.json
petdb edit sleepy-fox --spritesheet ./spritesheet.webp
petdb edit sleepy-fox --zip ./sleepy-fox.zip
petdb edit sleepy-fox \
  --zip ./sleepy-fox.zip \
  --description "Text options override manifest values"
```

Available options:

| Option | Meaning |
| --- | --- |
| `--description <text>` | Replace the description |
| `--display-name <name>` | Replace the display name |
| `--manifest <path>` | Use values from a replacement `pet.json` |
| `--spritesheet <path>` | Upload a replacement spritesheet and regenerate the poster |
| `--zip <path>` | Use a root-level package ZIP as the replacement source |

At least one option is required, and each option can appear only once.
`--zip` cannot be combined with `--manifest` or `--spritesheet`. Text options
can be combined with any file input and override the corresponding manifest
values.

The replacement spritesheet must remain in the active revision's V1 or V2
format. Its filename can change between `spritesheet.png` and
`spritesheet.webp`; the new manifest is updated accordingly.

Every successful edit creates a new pending revision based on the current
active revision. The active revision remains online and installable until the
new revision is approved. If another pending revision exists, the server
withdraws and replaces it only after the new upload finalizes successfully; a
failed edit leaves the previous pending revision unchanged.

### `petdb help`

Prints command, option, and environment summaries. The aliases `--help` and
`-h`, or invoking `petdb` without arguments, produce the same output.

```sh
petdb help
```

### `petdb version`

Prints the installed CLI version. The aliases `--version` and `-v` are also
supported.

```sh
petdb version
```

## Submission validation

`submit` and file-based `edit` perform local validation before upload:

| Item | Requirement |
| --- | --- |
| `pet.json` | UTF-8 JSON object, no larger than 64 KiB after canonicalization |
| `id` | Valid, non-reserved pet slug |
| `displayName` | Non-empty, at most 100 characters |
| `description` | Non-empty, at most 1,000 characters |
| `spritesheetPath` | Exactly `spritesheet.png` or `spritesheet.webp` |
| Spritesheet size | Non-empty and no larger than 10 MiB |
| V1 dimensions | `1536×1872` |
| V2 dimensions | `1536×2288` |
| Image | Extension matches PNG/WebP signature and supports alpha transparency |

If `formatVersion` is present in `pet.json`, it must match the dimensions. The
CLI uses `sharp` to crop the upper-left `192×208` region and writes a quality
90 `poster.webp`. The server independently validates the uploaded objects
before accepting the revision.

## Exit codes

| Code | Meaning |
| ---: | --- |
| `0` | Success |
| `2` | Invalid command or arguments |
| `3` | Network failure or timeout |
| `4` | Integrity or validation failure |
| `5` | Filesystem failure |
| `6` | Authentication failure |
| `7` | Service or API failure |

## Public catalogs

- [Live pet catalog](https://cdn.codexpetdb.com/catalogs/v1/pets.json)
- [Live collection catalog](https://cdn.codexpetdb.com/catalogs/v1/collections.json)

The catalogs are generated and published by the private Web project. They are
linked for community inspection but are not copied into this repository or the
npm package.

## Development

The npm runtime supports Node.js 20 and newer. Development and publication use
Node.js 26.4 and pnpm 11.13; CI additionally runs the packed tarball on Node.js
20.19 across Linux, macOS, and Windows.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm openapi:check
pnpm typecheck
pnpm test
pnpm build
pnpm pack:smoke
```

The committed internal SDK is generated from `contracts/cli-openapi.json`:

```sh
pnpm openapi:generate
pnpm openapi:check
```

The contract is synchronized from the private Web repository. It is not packed
into npm, and the generated SDK has no public package export.

## Release process for maintainers

Prepare and verify the release on a clean `main` commit before creating an
annotated version tag. The package version, CLI version, changelog heading, and
tag must match.

```sh
pnpm check
pnpm openapi:check
pnpm typecheck
pnpm test
pnpm build
pnpm pack:smoke
pnpm deploy:manual -- --dry-run
pnpm deploy:manual
```

`deploy:manual` validates the clean tagged commit, dispatches the GitHub Actions
publish workflow, and waits for it to finish. It does not create commits, push
branches or tags, create a GitHub Release, or run `npm publish` locally. After
the npm workflow succeeds, create the GitHub Release from the prepared
`RELEASE_NOTES.md`.

```sh
gh release create v1.1.3 \
  --verify-tag \
  --title "codexpetdb v1.1.3" \
  --notes-file RELEASE_NOTES.md
```

## License

MIT
