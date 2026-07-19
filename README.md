# petdb

[English](README.md) | [简体中文](README.zh-CN.md)

`petdb` downloads, verifies, and installs public Codex pets from CodexPetDB.
The database and web application are private; this CLI and its Public API
contract are maintained in public for community review.

```sh
npx petdb add sleepy-fox
npx petdb add-collection cozy-friends
```

Pets are installed in `~/.codex/pets/<pet-id>` by default. Set `CODEX_HOME`
to use another Codex directory or `PETDB_SITE_URL` to use another CodexPetDB
deployment.

The CLI reads site discovery and verified `/install` metadata before fetching
the ZIP from an explicitly allowed asset origin. Discovery, metadata, and asset
requests reject redirects. Content type, byte length, SHA-256, and archive
contents are checked before installation.

`add-collection` validates the public collection manifest and reuses one
discovery result while installing pets in manifest order. It stops at the first
failure and keeps already installed pets, so rerunning the command is safe. A
collection can contain at most 100 pets.

```sh
petdb help
petdb version
```

Exit codes: `0` success, `2` usage, `3` network, `4` integrity, and `5`
filesystem or installation failure.

## Public API contract

- [Live OpenAPI 1.0.0](https://cdn.codexpetdb.com/contracts/public/v1.0.0/openapi.json)
- [Versioned repository snapshot](contracts/openapi.json)

The snapshot is generated from the executable Zod schemas used by the Web API.
Published contract versions are immutable.

## Development

Requires Node.js 26.4 and pnpm 11.13.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm pack:smoke
pnpm openapi:preview
```

`openapi:preview` starts a Scalar API Reference at `http://localhost:4001` and
watches the contract for changes. Open the printed URL in a browser and press
`Ctrl+C` to stop the local server.

Maintainers publish manually from a clean, tagged `main` commit:

```sh
pnpm deploy:manual -- --dry-run
pnpm deploy:manual
```

The command dispatches the GitHub Actions publish workflow. It does not create
commits, push branches or tags, create a GitHub Release, or run `npm publish`
locally.

## License

MIT
