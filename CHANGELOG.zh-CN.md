# 更新日志

本文件记录 CodexPetDB CLI 的重要变更。

## 1.1.2 - 2026-07-22

### 修复

- `login` 现在会显示包含一次性代码的完整设备授权 URL，复制并打开后无需再次手动
  输入代码。

## 1.1.1 - 2026-07-22

### 新增

- 新增 `codexpetdb` 作为 `petdb` 的 binary 别名；全局安装后，两个命令均会调用
  同一个 CLI。

## 1.1.0 - 2026-07-22

### 新增

- 新增 `login`、`logout` 和 `whoami`，支持浏览器审批的 Device Authorization
  Flow、按站点隔离凭证、OS Keychain 和严格权限的文件回退。
- 新增 `submit`，支持提交 pet 目录、根级 ZIP 或包含多个 pet package 子目录的
  目录，同时支持 PNG 和 WebP spritesheet。
- 新增 `edit`，支持文字、manifest、spritesheet、ZIP 和组合编辑。每次编辑都创建
  pending revision，active revision 继续在线。
- 新增全局 `--debug` 参数，API 调用失败时输出 HTTP 状态码和经过脱敏、限制大小的
  响应内容。
- 新增认证失败退出码 `6` 和服务异常退出码 `7`。

### 安全性与可靠性

- 新增 manifest 大小和字段、spritesheet 文件签名、alpha、V1/V2 尺寸、压缩包
  结构和 ZIP traversal 本地校验。
- 使用 `sharp` 从左上角 `192×208` 区域确定性生成质量 90 的 `poster.webp`。
- 新增带内容声明、幂等控制、失败尽力 abort 和服务端 finalize 的认证 upload
  session。
- 禁止把 Bearer 凭证转发给外部 presigned upload target，并禁止 API client 跟随
  HTTP redirect。
- CLI API 请求新增明确的 timeout、Content-Type、Problem JSON 和脱敏诊断处理。
- 已有 pending edit 只会在新 upload finalize 后被替换；编辑失败会保留原 pending
  revision。

### 开发

- 新增 CLI 专用 OpenAPI 3.1 contract，以及由 `@hey-api/openapi-ts` 生成并提交的
  内部 SDK。npm 包不暴露 contract 或 SDK subpath。
- 新增 OpenAPI 防漂移检查，并扩展命令、API、凭证、资源和打包产物测试。
- CI 在 Linux、macOS 和 Windows 的 Node.js 20 环境增加 `sharp` 打包 runtime
  smoke。
- 打包 runtime smoke 在全新 CI runner 缺少平台相关 optional dependency 时允许
  从 registry 补齐依赖。
- 修复隐藏 tarball artifact 的上传，使 Linux、macOS 和 Windows 的 Node.js 20
  runtime smoke 都能运行真实 package。
- 修复打包 runtime smoke 在 Windows 下执行 npm 和 pnpm command shim 的方式。
- Windows 已加载的 `sharp` DLL 会在 smoke 进程退出前保持锁定，对应临时目录清理改为
  best-effort。
- 扩充英文和简体中文 README，完整记录命令、校验、凭证、退出码和发布流程。

## 1.0.0 - 2026-07-21

### 新增

- 首次发布 `petdb`。
- 新增 `petdb list`，用于列出公开 Catalog。
- 新增 `petdb install <pet-slug>`，用于校验并安装单只桌宠。
- 新增 `petdb install --collection <collection-slug>`，用于按顺序安装集合。
- 可恢复安装前新增 Content-Length、SHA-256、package 结构和 pet identity 校验。
