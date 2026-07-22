# codexpetdb v1.1.3

This patch release makes install-count reporting resilient to production cold
starts without changing the success behavior of local installation.

The best-effort metrics request now waits up to 10 seconds instead of 2
seconds. Reporting remains silent: a timeout or service error never fails or
adds noise to a successfully completed `petdb install` command.

## Install or upgrade

Node.js 20 or newer is required.

```sh
npm install --global codexpetdb@1.1.3
petdb version
codexpetdb version
```

See the
[complete changelog](https://github.com/codexpetdb/cli/blob/v1.1.3/CHANGELOG.md)
and [full command reference](https://github.com/codexpetdb/cli/blob/v1.1.3/README.md).
