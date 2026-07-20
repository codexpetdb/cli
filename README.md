# petdb

[English](README.md) | [简体中文](README.zh-CN.md)

`petdb` lists and installs verified public Codex pets from CodexPetDB. The
database and Web application are private; this CLI is maintained publicly for
community review.

```sh
npx petdb list
npx petdb install sleepy-fox
npx petdb install --collection cozy-friends
```

Pets are installed in `~/.codex/pets/<pet-slug>` by default. Set `CODEX_HOME`
to use another Codex directory or `PETDB_SITE_URL` to use another CodexPetDB
deployment.

`list` fetches the static public catalog once and prints each pet's slug, name,
and author. `install` reads site discovery and the same catalog, derives the
package URL from the trusted asset origin, and verifies its content type, byte
length, SHA-256, ZIP structure, and `pet.json.id` before a recoverable install.

Collection installation fetches the static Pet and Collection catalogs once,
then installs pets in the Collection catalog's declared order. It stops at the
first failure and keeps pets already installed, so rerunning the command is
safe. A collection can contain at most 100 pets. Successful installs send a
two-second best-effort metrics request; reporting failures never change the
command exit code.

```sh
petdb help
petdb version
```

Exit codes: `0` success, `2` usage, `3` network, `4` integrity, and `5`
filesystem or installation failure.

## Public catalogs

- [Live pet catalog](https://cdn.codexpetdb.com/catalogs/v1/pets.json)
- [Live collection catalog](https://cdn.codexpetdb.com/catalogs/v1/collections.json)

The catalogs are generated and published by the private Web project. They are
linked here for community inspection but are not copied into the npm package or
this repository.

## Development

The npm runtime supports Node.js 20 and newer. Development and publication use
Node.js 26.4 and pnpm 11.13; CI additionally runs the packed tarball on Node.js
20.19.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm pack:smoke
```

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
