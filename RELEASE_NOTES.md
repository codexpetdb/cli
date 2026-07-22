# codexpetdb v1.1.1

This patch release adds `codexpetdb` as a binary alias for `petdb`. After a
global installation, either command invokes the same CLI:

```sh
petdb login
codexpetdb login
```

The packed-package smoke test now runs `version` through both installed binary
names to prevent either alias from disappearing in a future release.

## Install or upgrade

Node.js 20 or newer is required.

```sh
npm install --global codexpetdb@1.1.1
petdb version
codexpetdb version
```

See the
[complete changelog](https://github.com/codexpetdb/cli/blob/v1.1.1/CHANGELOG.md)
and [full command reference](https://github.com/codexpetdb/cli/blob/v1.1.1/README.md).
