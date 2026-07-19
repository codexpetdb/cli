# petdb

[English](README.md) | [简体中文](README.zh-CN.md)

`petdb` 用于从 CodexPetDB 下载、校验并安装公开的 Codex 桌宠。数据库和 Web
应用保持闭源；CLI 与 Public API 契约公开维护，方便社区审阅。

```sh
npx petdb add sleepy-fox
npx petdb add-collection cozy-friends
```

默认安装到 `~/.codex/pets/<pet-id>`。可通过 `CODEX_HOME` 修改 Codex 目录，
通过 `PETDB_SITE_URL` 切换 CodexPetDB 站点。

CLI 先读取站点 Discovery 和经过验证的 `/install` metadata，再从 Discovery
明确允许的资产 origin 下载 ZIP。Discovery、metadata 和资产请求都拒绝
redirect；安装前校验 Content-Type、长度、SHA-256 和压缩包内容。

`add-collection` 会严格校验公开 Collection manifest，并在一次 Discovery 后按
manifest 顺序复用相同的安全安装流程。命令遇到首个失败即停止并保留此前成功安装
的桌宠，因此可以安全重试。单个集合最多包含 100 只桌宠。

```sh
petdb help
petdb version
```

退出码：`0` 成功，`2` 参数错误，`3` 网络失败，`4` 完整性校验失败，`5`
文件系统或安装失败。

## Public API 契约

- [线上 OpenAPI 1.0.0](https://cdn.codexpetdb.com/contracts/public/v1.0.0/openapi.json)
- [仓库内版本化快照](contracts/openapi.json)

快照由 Web API 实际使用的可执行 Zod schema 生成；已经发布的契约版本不可覆盖。

## 开发

需要 Node.js 26.4 和 pnpm 11.13。

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm pack:smoke
pnpm openapi:preview
```

`openapi:preview` 会在 `http://localhost:4001` 启动 Scalar API Reference，并监听
契约变化。在浏览器中打开终端输出的 URL，按 `Ctrl+C` 停止本地服务。

维护者从干净、已经打 tag 且与远端 `main` 一致的提交手动发布：

```sh
pnpm deploy:manual -- --dry-run
pnpm deploy:manual
```

该命令只触发并等待 GitHub Actions 发布工作流，不创建 commit、不推送 branch 或
tag、不创建 GitHub Release，也不在本机运行 `npm publish`。

## 许可证

MIT
