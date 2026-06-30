# 2026-06-29 新建对话无反应修复

## 问题
- 用户反馈“新建对话点击创建对话没有任何反应”。
- 根因有两个：
  - 前端 `onCreateConversation` 对 API 失败没有 catch，异常变成未处理 Promise，弹窗没有错误提示。
  - 后端没有 CORS 预检处理，Tauri/Vite 开发源 `http://127.0.0.1:5173` 调本地 API `http://127.0.0.1:8787` 时会被拦截。
- 额外发现：`login()` 在后端会话加载完成前就设置 `authed=true`，如果后端不可用会进入空聊天界面；`pnpm --filter desktop dev` 只启动 Tauri/Vite，不会自动启动后端。

## 修复
- `apps/desktop/src/App.tsx`
  - 新建对话增加 `creatingConversation` 与 `newConversationErr` 状态。
  - 创建失败时保留弹窗并显示错误，按钮恢复可点击。
  - 创建成功后清空搜索条件，避免新会话被当前搜索过滤隐藏。
  - 登录流程改为先加载后端会话成功，再进入已登录状态。
- `apps/desktop/src/App.css`
  - 新增 `.modal-error` 样式。
- `apps/server/src/middleware/cors.ts`
  - 新增受限 CORS 中间件，只允许本地桌面开发/Tauri 来源，不使用通配 `*`。
- `apps/server/src/app.ts`
  - 在鉴权前接入 `/api/*` CORS 中间件。
- `apps/desktop/scripts/before-dev.cmd`
  - 桌面开发启动时若 8787 未监听，后台启动 `pnpm --filter server dev`，再启动 Vite。
- `apps/desktop/src-tauri/tauri.conf.json`
  - `beforeDevCommand` 改为 `pnpm desktop:before-dev`。

## 验证
- `pnpm --filter desktop test`：4 files / 25 tests passed。
- `pnpm --filter server test`：12 files / 42 tests passed。
- `pnpm --filter desktop build`：通过。
- `pnpm --filter server build`：通过。
- `python scripts/verify.py`：5 passed, 0 failed/unenforced。
- 已重启本项目开发进程，当前端口：
  - Vite `127.0.0.1:5173` listening。
  - Server `127.0.0.1:8787` listening。
  - `GET http://127.0.0.1:8787/health` 返回 `{"status":"ok"}`。
