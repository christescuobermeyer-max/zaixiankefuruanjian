# 进度交接

## 当前目标
后端 API 与 Tauri/React 前端均已上线运行；当前处于功能迭代与自动更新发布阶段。

## 已完成
- 已有 `docs/项目开发文档.md`、`docs/前端UI设计文档.md`、线框图和实施计划。
- 本次初始化创建项目级 `AGENTS.md`、标准 harness 文档、约束验证配置、脚本入口和环境变量占位文件。
- 本次初始化建立 `apps/server`、`apps/desktop`、`scripts` 和 pnpm workspace 边界。
- 已新增 `docs/backend-development.md`，把当前阶段范围收敛到后端 API、MongoDB、Supabase Auth/JWT、LLM 流式接口和云服务器部署。
- 桌面端已上线并接入 Tauri 自动更新（OSS `zaixiankefu/`），当前版本 0.1.5。
- 迭代记录（详见 `docs/memory/2026-06-30-1529-ux-replies-quit-and-release.md`）：
  - 客服回复优化为简短单段、去除空行分段、去掉 `@老板`/称谓（prompt + `normalizeReply` 兜底，已部署云端）。
  - 标题栏新增「退出软件」按钮（`exit(0)`，0.1.4）。
  - 聊天区随消息/流式输出自动滚动；生成中显示 `TypingDots` 加载动画替代固定文本（0.1.5）。
- 构建/发布操作要点见同一 memory：桌面构建需用 VS 2022 Community 的 `vcvars64.bat`（VS 18 Insiders 工具集 include 为空会失败）；后端经 `tar+scp+pm2 restart` 部署到 Sealos（非 git 仓库）。

## 进行中
- 尚未进入 Tauri/React 代码脚手架。
- 后续前端对接入口文档见 `docs/backend-completion.md`。

## 后端完成状态
- 后端 Hono 工程已创建，核心 API、Supabase JWT 鉴权、MongoDB 数据服务、LLM 配置封装和聊天落库已实现。
- 云服务器已连接，Node.js、pnpm、PM2 已安装，后端代码已同步并通过云端测试/构建。
- 云端 PM2 服务 `zaixiankefu-api` 已启动并保存，`GET /health` 返回 `{ "status": "ok" }`。
- 云端连通性核对：Supabase Auth/JWKS OK；MongoDB OK，数据库 `zaixiankefu` 下已有 `conversations,messages` 集合；LLM API OK。
- Supabase URL 已配置为 `https://fhtmewbnivxqiyfujgeb.supabase.co`，后端已支持通过 Supabase JWKS 验证 JWT；`SUPABASE_JWT_SECRET` 可选。
- Supabase `anon` key、`service_role` key 已同步到云端环境；当前后端 API 不直接使用 Supabase Postgres Database。
- 阿里云 OSS 环境已同步并通过只读连通验证；可用 region 为 `oss-cn-hangzhou`，前缀为 `zaixiankefu/`。

## 阻塞/待确认
- 仍需前端使用真实 Supabase 登录 session 的 access token 做端到端 API smoke test。
- Windows Tauri 构建环境需要安装 Rust、MSVC Build Tools、WebView2 和 Node/pnpm。
- 若在远程 Linux 服务器开发，只适合日常前端/后端开发；Windows 桌面行为仍需 Windows 环境验收。
- Tauri 自动更新发布脚本已落地并多次发布成功（`apps/desktop/scripts/release.mjs` + 本机 `.tauri-keys/` 签名私钥，无密码）。

## 下一步安全动作
1. 进入前端开发前先阅读 `docs/backend-completion.md`。
2. 前端只使用 Supabase anon key 和后端 API，不接触服务端密钥。
3. 每进入核心功能实现前按 TDD 写失败测试。
