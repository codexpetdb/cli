# petdb

[English](README.md) | [简体中文](README.zh-CN.md)

`petdb` 用于查看并安装 CodexPetDB 中经过校验的公开 Codex 桌宠。数据库和 Web
应用保持闭源；CLI 公开维护，方便社区审阅。

```sh
npx petdb list
npx petdb install sleepy-fox
npx petdb install --collection cozy-friends
```

默认安装到 `~/.codex/pets/<pet-slug>`。可通过 `CODEX_HOME` 修改 Codex 目录，
通过 `PETDB_SITE_URL` 切换 CodexPetDB 站点。

`list` 只拉取一次静态全量 Catalog，并显示每只桌宠的 slug、名称和作者。
`install` 读取站点 Discovery 与同一份 Catalog，从受信任的资产 origin 派生 ZIP
地址；可恢复安装前会校验 Content-Type、字节长度、SHA-256、ZIP 结构和
`pet.json.id`。

Collection 安装只拉取一次 Collection manifest 和一次 Catalog，并按 manifest
顺序安装。命令遇到首个失败即停止，已经安装的桌宠会保留，因此可以安全重试。
单个集合最多包含 100 只桌宠。成功安装后会在两秒内尽力上报统计；上报失败不会
改变命令退出码。

```sh
petdb help
petdb version
```

退出码：`0` 成功，`2` 参数错误，`3` 网络失败，`4` 完整性校验失败，`5`
文件系统或安装失败。

## 公开契约

- [线上 OpenAPI 1.0.0](https://cdn.codexpetdb.com/contracts/public/v1.0.0/openapi.json)
- [线上 Pet Catalog](https://cdn.codexpetdb.com/catalogs/v1/pets.json)

OpenAPI 和 Catalog 均由闭源 Web 项目生成并发布。CLI 仓库仅提供社区审阅链接，
不会把对应文件复制进 npm 包或本仓库。

## 开发

npm runtime 支持 Node.js 20 及以上版本。开发和发布使用 Node.js 26.4 与 pnpm
11.13；CI 还会在 Node.js 20.19 下运行打包后 tarball 的 runtime smoke。

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm pack:smoke
```

维护者从干净、已经打 tag 且与远端 `main` 一致的提交手动发布：

```sh
pnpm deploy:manual -- --dry-run
pnpm deploy:manual
```

该命令只触发并等待 GitHub Actions 发布工作流，不创建 commit、不推送 branch 或
tag、不创建 GitHub Release，也不在本机运行 `npm publish`。

## 许可证

MIT
