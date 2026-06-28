# 架构说明

## 当前技术栈
- 桌面壳：Tauri 2.x，Rust，Windows 目标平台。
- 前端：React + TypeScript + Vite，Vercel AI SDK + prompt-kit。
- 后端：Node.js + TypeScript + Hono，SSE 流式响应。
- 鉴权：Supabase Auth，后端校验 JWT。
- 数据库：MongoDB，数据库名 `zaixiankefu`。
- LLM：云雾 OpenAI 兼容接口，模型配置通过 `LLM_MODEL`。
- 更新分发：Tauri Updater + 阿里云 OSS `zaixiankefu/` 前缀。
- 包管理：pnpm workspace。

## 进程与数据流
1. Tauri Rust 壳负责窗口、热区、显示/隐藏和 updater。
2. React 前端负责登录、对话列表、消息渲染、输入框和 panel 状态。
3. 前端携带 Supabase JWT 调用后端 API。
4. Hono 后端验证 JWT，按 userId 读取 conversation/messages。
5. 后端按阈值决定是否摘要压缩，组装 system prompt + summary + recent messages。
6. 后端调用云雾 LLM 并用 SSE 流式返回。
7. 流结束后后端写入 MongoDB，并更新 conversation tokenCount/updatedAt。

## 契约：后端 API

### 责任
- 负责鉴权、资源隔离、对话 CRUD、历史消息读取、流式聊天、上下文压缩和落库。
- 不负责保存客户端密钥、不负责 UI 状态、不直接执行桌面窗口行为。

### 输入
- `Authorization: Bearer <Supabase JWT>`，除 `/health` 外必需。
- `POST /api/conversations`：`{ "name": "string" }`。
- `POST /api/chat`：`{ "conversationId": "string", "message": "string" }`。

### 输出
- `/health` 返回 `{ "status": "ok" }`。
- conversation 和 message 响应必须只包含当前 userId 可访问数据。
- `/api/chat` 返回 `text/event-stream`。

### 错误与回滚
- 无 token、签名失败或配置缺失返回 401。
- 访问他人资源返回 403 或 404。
- LLM 中断时返回用户可见错误；已保存 user 消息可重试。

### 安全
- 服务端持有 LLM Key、MongoDB URI、JWT secret 和 system prompt。
- 日志不得输出 token、连接串、完整 prompt 或用户敏感信息。

### 验证
- Vitest 覆盖 `/health`、auth middleware、conversation routes、chat route、context compaction。

## 契约：Tauri 桌面壳

### 责任
- 管理无边框 always-on-top 窗口、顶部热区、显示隐藏命令和 updater。
- 不负责业务鉴权、LLM 调用或数据库访问。

### 输入
- 前端调用 `reveal_panel()`、`hide_panel()`。
- Rust 热区检测发出 `reveal` 事件。

### 输出
- 面板位于屏幕顶部居中，宽度 720px，高度默认 500px。
- 隐藏状态保留顶部入口或图标条。

### 错误与回滚
- 命令失败时前端显示可恢复错误，不影响对话数据。
- 自动更新失败不得破坏当前安装包。

### 安全
- Tauri capabilities 只开放必要 command。
- 更新包必须签名校验。

### 验证
- command/capability/wrapper 源码约束测试。
- Windows 桌面手动验收顶部热区、Pin 和失焦隐藏。

## 契约：数据库

### `conversations`
- 字段：`_id`、`userId`、`name`、`summary`、`tokenCount`、`createdAt`、`updatedAt`。
- 索引：`{ userId: 1, updatedAt: -1 }`。

### `messages`
- 字段：`_id`、`conversationId`、`userId`、`role`、`content`、`tokens`、`createdAt`。
- 索引：`{ conversationId: 1, createdAt: 1 }`。

### 约束
- 所有查询必须带 userId 或先校验 conversation 归属。
- schema 变更必须同步服务类型、测试和文档。
