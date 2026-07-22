# CodexPetDB CLI

[English](README.md) | [简体中文](README.zh-CN.md) |
[更新日志](CHANGELOG.zh-CN.md)

`codexpetdb` npm 包提供 `petdb` 命令及等价的 `codexpetdb` 别名，用于发现、安装、
提交和编辑 CodexPetDB 中经过校验的 Codex 桌宠。数据库和 Web 应用保持闭源；CLI
公开维护，方便社区审阅。

## 环境要求与安装

需要 Node.js 20 或更高版本。

```sh
npm install --global codexpetdb
petdb version
codexpetdb version
```

也可以不安装全局包，直接执行：

```sh
npx codexpetdb list
```

## 全局用法

```text
petdb [--debug] <command>
codexpetdb [--debug] <command>
```

两个 binary 名称运行同一个 CLI。下文示例统一使用更短的 `petdb`。

`--debug` 可以放在命令前或命令后。HTTP 调用失败时，它会向 stderr 输出状态码和
经过脱敏的响应内容。敏感字段会被移除，响应最多输出 16 KiB。请求成功或失败时没有
收到 HTTP 响应，不会产生 HTTP debug 记录。

```sh
petdb --debug submit ./my-pet --yes
petdb whoami --debug
```

CLI 读取以下环境变量：

| 变量 | 用途 | 默认值 |
| --- | --- | --- |
| `CODEX_HOME` | Codex 数据目录和桌宠安装根目录 | `~/.codex` |
| `PETDB_SITE_URL` | CodexPetDB HTTP(S) 站点 origin | 生产站点 |

`PETDB_SITE_URL` 必须是没有路径、凭证、query 或 fragment 的 origin。登录凭证按该
origin 隔离。

## 命令参考

### `petdb list`

按 Catalog 顺序列出当前可用的全部桌宠。

```sh
petdb list
```

命令只下载一次静态 Pet Catalog，并输出每只桌宠的 slug、显示名称和作者。它不会
安装桌宠，也不需要登录。

### `petdb install <pet-slug>`

按精确 slug 安装一只桌宠。

```sh
petdb install sleepy-fox
```

桌宠会安装到 `$CODEX_HOME/pets/<pet-slug>`，默认位置为
`~/.codex/pets/<pet-slug>`。CLI 读取站点 Discovery 和 Pet Catalog，从受信任的
资产 origin 派生 package URL，并校验响应 Content-Type、字节长度、SHA-256、ZIP
结构和 `pet.json.id`。写入目标失败时，安装过程可以恢复。

安装成功后会以两秒超时尽力上报统计；统计上报失败不会改变命令结果。

### `petdb install --collection <collection-slug>`

按集合声明的顺序安装其中全部桌宠。

```sh
petdb install --collection cozy-friends
```

命令分别下载一次 Pet Catalog 和 Collection Catalog，然后依次安装，单个集合最多
100 只桌宠。遇到首个失败就停止，已经安装的桌宠会保留，因此可以安全重试。

### `petdb login`

通过浏览器审批的 Device Authorization Flow 登录。

```sh
petdb login
```

CLI 会显示包含一次性代码的完整验证 URL、代码本身和过期时间，并尝试打开浏览器。
复制并打开该 URL 后无需再次手动输入代码。随后 CLI 持续轮询，直到请求被批准、
拒绝、过期、用 `Ctrl+C` 取消或发生失败。如果当前站点已经有有效凭证，`login` 会
显示当前身份而不会切换账号；如需更换账号，请先执行 `petdb logout`。

凭证优先存入 OS Keychain。回退文件会原子写入，并在支持的 Unix 系统上限制为
`0600` 权限：

| 平台 | 回退凭证文件 |
| --- | --- |
| macOS 和 Linux | `${XDG_CONFIG_HOME:-~/.config}/codexpetdb/credentials.json` |
| Windows | `%APPDATA%\CodexPetDB\credentials.json` |

### `petdb logout [--local-only]`

撤销当前 session 并删除本地凭证。

```sh
petdb logout
petdb logout --local-only
```

不带 `--local-only` 时，CLI 会先撤销服务端 session。网络或服务异常时会保留本地
凭证，以便稍后重试撤销。`--local-only` 只删除当前电脑保存的凭证。

### `petdb whoami`

显示当前站点凭证对应的账号。

```sh
petdb whoami
```

输出包含站点 origin、公开 UID、名称、邮箱和 session 过期时间，永远不会显示
Bearer token。

### `petdb submit <path> [--yes]`

校验并提交一只或多只新桌宠进入审核。

```sh
petdb submit ./my-pet
petdb submit ./my-pet.zip --yes
petdb submit ./pet-batch --yes
```

`<path>` 支持以下三种形式：

1. 包含 `pet.json` 和 spritesheet 的目录。
2. `.zip` 文件，`pet.json` 和 spritesheet 必须位于压缩包根目录。
3. 父目录，其直接子目录分别是 pet package。

批量模式只扫描直接子目录中包含 `pet.json` 的目录，不扫描更深层目录或子 ZIP。
每个 package 独立提交，最后输出成功与失败汇总。后续项目失败时，之前成功的项目仍会
保留。

在交互式终端中，不带 `--yes` 会要求确认；非交互环境必须传入 `--yes`。

命令要求先登录。CLI 创建 upload session，上传经过校验的 manifest、spritesheet 和
生成的 poster，然后 finalize submission。失败时会尽力 abort upload。当前用户已经
拥有同名 slug 时应改用 `petdb edit`；slug 属于其他用户时返回冲突。CLI 不会自动
添加后缀。

### `petdb edit <slug> [options]`

为当前登录用户拥有的桌宠创建待审核 revision。

```sh
petdb edit sleepy-fox --description "更安静的森林伙伴"
petdb edit sleepy-fox --display-name "Sleepy Fox"
petdb edit sleepy-fox --manifest ./pet.json
petdb edit sleepy-fox --spritesheet ./spritesheet.webp
petdb edit sleepy-fox --zip ./sleepy-fox.zip
petdb edit sleepy-fox \
  --zip ./sleepy-fox.zip \
  --description "文字参数覆盖 manifest 中的值"
```

可用选项：

| 选项 | 含义 |
| --- | --- |
| `--description <text>` | 替换说明 |
| `--display-name <name>` | 替换显示名称 |
| `--manifest <path>` | 使用替换 `pet.json` 中的值 |
| `--spritesheet <path>` | 上传替换 spritesheet，并重新生成 poster |
| `--zip <path>` | 使用根级 package ZIP 作为替换来源 |

至少需要一个选项，每个选项最多出现一次。`--zip` 不能和 `--manifest` 或
`--spritesheet` 组合。文字选项可以与任意文件输入组合，并覆盖 manifest 中的对应值。

替换 spritesheet 必须保持 active revision 的 V1 或 V2 格式。文件名可以在
`spritesheet.png` 和 `spritesheet.webp` 之间切换，新 manifest 会同步更新。

每次成功编辑都会基于当前 active revision 创建新的 pending revision。新版本审核
通过前，active revision 继续在线并可安装。如果已经存在 pending revision，服务端
只会在新 upload 成功 finalize 后撤回并替换它；编辑失败不会影响之前的 pending
revision。

### `petdb help`

输出命令、参数和环境变量摘要。`--help`、`-h` 或不带参数执行 `petdb` 时输出相同
内容。

```sh
petdb help
```

### `petdb version`

输出已安装的 CLI 版本。也支持 `--version` 和 `-v`。

```sh
petdb version
```

## 提交校验

`submit` 和带文件的 `edit` 会在上传前执行本地校验：

| 项目 | 要求 |
| --- | --- |
| `pet.json` | UTF-8 JSON object，canonicalize 后不超过 64 KiB |
| `id` | 合法且未保留的 pet slug |
| `displayName` | 非空，最多 100 个字符 |
| `description` | 非空，最多 1,000 个字符 |
| `spritesheetPath` | 只能是 `spritesheet.png` 或 `spritesheet.webp` |
| Spritesheet 大小 | 非空且不超过 10 MiB |
| V1 尺寸 | `1536×1872` |
| V2 尺寸 | `1536×2288` |
| 图片 | 扩展名匹配 PNG/WebP 文件签名，并支持 alpha 透明通道 |

如果 `pet.json` 包含 `formatVersion`，必须与图片尺寸匹配。CLI 使用 `sharp` 裁剪左上角
`192×208` 区域，并生成质量 `90` 的 `poster.webp`。服务端仍会独立重验上传对象，
通过后才接受 revision。

## 退出码

| 退出码 | 含义 |
| ---: | --- |
| `0` | 成功 |
| `2` | 命令或参数错误 |
| `3` | 网络失败或超时 |
| `4` | 完整性或校验失败 |
| `5` | 文件系统失败 |
| `6` | 认证失败 |
| `7` | 服务或 API 失败 |

## 公开 Catalog

- [线上 Pet Catalog](https://cdn.codexpetdb.com/catalogs/v1/pets.json)
- [线上 Collection Catalog](https://cdn.codexpetdb.com/catalogs/v1/collections.json)

Catalog 由闭源 Web 项目生成并发布。CLI 仓库仅提供社区审阅链接，不会把对应文件
复制进本仓库或 npm 包。

## 开发

npm runtime 支持 Node.js 20 及以上版本。开发和发布使用 Node.js 26.4 与 pnpm
11.13；CI 还会在 Linux、macOS 和 Windows 的 Node.js 20.19 环境运行打包后 tarball
的 runtime smoke。

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm openapi:check
pnpm typecheck
pnpm test
pnpm build
pnpm pack:smoke
```

内部 SDK 由 `contracts/cli-openapi.json` 生成：

```sh
pnpm openapi:generate
pnpm openapi:check
```

contract 从私有 Web 仓库同步，不进入 npm 包；generated SDK 不提供公开 package
export。

## 维护者发布流程

先在干净的 `main` commit 上准备并验证 release，再创建 annotated version tag。
package version、CLI version、changelog 标题和 tag 必须一致。

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

`deploy:manual` 校验干净且已经打 tag 的 commit，触发 GitHub Actions 发布 workflow，
并等待执行结束。它不创建 commit、不推送 branch 或 tag、不创建 GitHub Release，
也不在本机运行 `npm publish`。npm workflow 成功后，再使用准备好的
`RELEASE_NOTES.md` 创建 GitHub Release。

```sh
gh release create v1.1.3 \
  --verify-tag \
  --title "codexpetdb v1.1.3" \
  --notes-file RELEASE_NOTES.md
```

## 许可证

MIT
