# codexpetdb v1.1.2

This patch release makes browser-approved login easier to complete from
terminals where automatic browser opening is unavailable.

`petdb login` and `codexpetdb login` now print the complete device
authorization URL containing the one-time code. Copying and opening that URL
continues directly to approval without requiring the code to be entered again:

```sh
petdb login
```

The separate code and expiration time remain visible as a fallback.

## Install or upgrade

Node.js 20 or newer is required.

```sh
npm install --global codexpetdb@1.1.2
petdb version
codexpetdb version
```

See the
[complete changelog](https://github.com/codexpetdb/cli/blob/v1.1.2/CHANGELOG.md)
and [full command reference](https://github.com/codexpetdb/cli/blob/v1.1.2/README.md).
