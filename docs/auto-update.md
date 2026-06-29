# 自动更新（Tauri Updater + 阿里云 OSS）

## 架构

- 客户端：`tauri-plugin-updater` + `tauri-plugin-process`，启动时静默检查更新。
- 更新源：阿里云 OSS，固定前缀 `zaixiankefu/`。
- 元数据：`zaixiankefu/latest.json`（Tauri updater 标准结构）。
- 安全：所有更新包用 minisign 私钥签名，客户端用内置公钥校验，校验失败不安装。

## 关键文件

| 文件 | 作用 |
|---|---|
| `apps/desktop/src-tauri/tauri.conf.json` | `plugins.updater`（endpoints + pubkey）、`bundle.createUpdaterArtifacts` |
| `apps/desktop/src-tauri/src/lib.rs` | 注册 updater / process 插件 |
| `apps/desktop/src-tauri/capabilities/default.json` | `updater:default`、`process:default` 权限 |
| `apps/desktop/src/updater.ts` | 前端检查 / 下载 / 安装 / 重启逻辑 |
| `apps/desktop/scripts/release.mjs` | 发布脚本：上传安装包 + latest.json 到 OSS |
| `apps/desktop/scripts/release-lib.mjs` | 发布纯逻辑（OSS key、latest.json 组装），含单测 |

## 签名密钥

- 用 `pnpm --filter desktop exec tauri signer generate` 生成。
- 私钥保存在 `.tauri-keys/`（已 gitignore，**绝不提交**）。
- 公钥已写入 `tauri.conf.json` 的 `plugins.updater.pubkey`。
- 构建时通过环境变量提供私钥：
  - `TAURI_SIGNING_PRIVATE_KEY`（私钥内容或路径）
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（若设了密码）

## 发布流程

1. 升级版本号：改 `apps/desktop/src-tauri/tauri.conf.json` 的 `version`。
2. 构建带签名的更新包：
   ```bash
   # 私钥通过环境变量注入
   pnpm --filter desktop tauri:build
   ```
   产物在 `src-tauri/target/release/bundle/nsis/`（`*-setup.exe` + `*-setup.exe.sig`）。
3. 演练（不上传，先看发布计划）：
   ```bash
   pnpm --filter desktop release
   ```
4. 配好 OSS 环境变量后真实发布：
   ```bash
   # ALI_OSS_REGION / ALI_OSS_ACCESS_KEY_ID / ALI_OSS_ACCESS_KEY_SECRET / ALI_OSS_BUCKET
   # ALI_OSS_PREFIX 可选，默认 zaixiankefu/
   node apps/desktop/scripts/release.mjs --confirm
   ```

## OSS 约定

- `ALI_OSS_PREFIX` 固定 `zaixiankefu/`，避免与其他项目更新文件混淆。
- endpoint：`https://<bucket>.<region>.aliyuncs.com/zaixiankefu/latest.json`
- 当前配置 region `oss-cn-hangzhou`、bucket `shiping-1-2`（如实际不同，需同步改 `tauri.conf.json` 的 endpoint）。

## 验证

- 前端逻辑：`apps/desktop/src/updater.test.ts`
- 发布逻辑：`apps/desktop/scripts/release-lib.test.mjs`
- Rust 编译：在 VS 开发环境内 `cargo check`（见 `scripts/cargo-check.cmd`）

## 注意

- 自动更新失败不得破坏当前安装（Tauri updater 默认行为：校验失败 / 下载失败则不替换）。
- 浏览器预览（非 Tauri 环境）下 `updater.ts` 会直接返回 up-to-date，不报错。
- 真实 OSS 写入前必须人工确认（`--confirm`），默认 dry-run。
