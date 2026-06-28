# 后端完成与前端对接文档

> 日期：2026-06-28  
> 范围：Node.js + Hono 后端、Supabase Auth 鉴权、MongoDB 业务持久化、LLM 调用、云服务器部署和阿里云 OSS 环境连通。Tauri/React 前端和 Tauri 自动更新发布脚本不在本文完成范围内。

## 1. 完成结论

当前后端 API 阶段已经完成，可以作为后续 Tauri 前端开发的对接基础。

已完成：
- Hono 后端工程：`apps/server`
- 健康检查：`GET /health`
- Supabase JWT 鉴权：所有 `/api/*` 接口都需要 `Authorization: Bearer <access_token>`
- Conversation 管理：创建、列表、消息读取、删除
- Chat 接口：接收用户消息，调用 LLM，返回 SSE，并将 user/assistant 消息写入 MongoDB
- MongoDB 持久化：数据库 `zaixiankefu`，集合 `conversations`、`messages`
- 用户资源隔离：所有业务查询按 Supabase JWT 的 `sub` 派生 `userId`
- 云服务器部署：PM2 服务 `zaixiankefu-api`
- 云端集成验证：Supabase Auth/JWKS、MongoDB、LLM API、阿里云 OSS 环境连通

未包含在当前后端 API 阶段：
- Tauri/React 前端界面
- Tauri 自动更新发布脚本
- Tauri updater 签名私钥配置
- Supabase Postgres Database 读写

说明：本项目当前使用 Supabase 做登录认证，业务数据存储在 MongoDB。`SUPABASE_DB_URL` 即使已填写，也不是当前后端运行路径的必需项。

## 2. 云端运行状态

- 云服务器路径：`/home/devbox/zaixiankefuruanjian`
- 后端应用路径：`/home/devbox/zaixiankefuruanjian/apps/server`
- PM2 服务名：`zaixiankefu-api`
- 监听端口：`8787`
- 健康检查：`http://127.0.0.1:8787/health`
- 健康检查响应：

```json
{ "status": "ok" }
```

已验证：
- `python scripts/verify.py`：通过
- 本地 `pnpm --filter server test`：11 个测试文件、31 个测试通过
- 本地 `pnpm --filter server build`：通过
- 云端 `pnpm --filter server test`：11 个测试文件、31 个测试通过
- 云端 `pnpm --filter server build`：通过
- 云端 PM2 进程环境已加载 Supabase、MongoDB、LLM 和 OSS 相关变量

## 3. 后端技术栈

- Runtime：Node.js 20+
- 语言：TypeScript
- Web 框架：Hono
- 数据库驱动：MongoDB Node.js Driver
- JWT 校验：`jose`
- 测试：Vitest
- 进程管理：PM2
- 包管理：pnpm workspace

关键文件：

```text
apps/server/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── index.ts
    ├── app.ts
    ├── config/env.ts
    ├── middleware/auth.ts
    ├── routes/health.ts
    ├── routes/conversations.ts
    ├── routes/chat.ts
    ├── services/mongo.ts
    ├── services/conversation-service.ts
    ├── services/chat-service.ts
    ├── services/context-compaction.ts
    ├── services/llm.ts
    ├── prompts/customer-service.ts
    └── types/domain.ts
```

## 4. 前端对接总规则

所有 `/api/*` 请求必须带 Supabase 登录后得到的 access token：

```http
Authorization: Bearer <supabase-session-access-token>
Content-Type: application/json
```

前端登录流程建议：
1. Tauri 前端使用 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 登录。
2. 登录成功后从 Supabase session 中取 `access_token`。
3. 调后端 `/api/*` 时把该 token 放入 `Authorization` header。
4. 后端验证 JWT 后从 payload `sub` 得到 `userId`。
5. 前端不需要、也不能接触 MongoDB URI、LLM Key、OSS Secret 或 Supabase service role key。

错误格式统一为：

```json
{ "error": "错误信息" }
```

常见状态码：
- `200`：成功
- `201`：创建成功
- `400`：请求体缺字段或字段为空
- `401`：未登录、token 缺失或 token 无效
- `404`：对话不存在，或不属于当前登录用户

## 5. API 契约

### 5.1 健康检查

```http
GET /health
```

不需要鉴权。

响应：

```json
{ "status": "ok" }
```

### 5.2 获取对话列表

```http
GET /api/conversations
Authorization: Bearer <access_token>
```

返回当前登录用户的对话，按 `updatedAt` 倒序。

响应：

```json
[
  {
    "id": "668000000000000000000001",
    "name": "川味小厨",
    "summary": "",
    "tokenCount": 0,
    "createdAt": "2026-06-28T09:00:00.000Z",
    "updatedAt": "2026-06-28T09:00:00.000Z"
  }
]
```

### 5.3 创建对话

```http
POST /api/conversations
Authorization: Bearer <access_token>
Content-Type: application/json
```

请求：

```json
{ "name": "川味小厨" }
```

规则：
- `name.trim()` 不能为空。
- 成功返回 `201`。

响应：

```json
{
  "id": "668000000000000000000001",
  "name": "川味小厨",
  "summary": "",
  "tokenCount": 0,
  "createdAt": "2026-06-28T09:00:00.000Z",
  "updatedAt": "2026-06-28T09:00:00.000Z"
}
```

### 5.4 搜索命名对话

```http
GET /api/conversations/search?q=<keyword>
Authorization: Bearer <access_token>
```

用途：
- 前端顶部或侧边栏搜索框使用。
- 根据命名会话的 `name` 字段搜索匹配会话。
- 点选搜索结果后，前端进入该 conversation，并调用 `GET /api/conversations/:id/messages` 加载历史聊天内容。

规则：
- 只搜索当前登录用户自己的 conversation。
- `q` 会 `trim()` 后使用。
- 空关键词返回空数组。
- 匹配方式为名称包含关键词，大小写不敏感。
- 结果按 `updatedAt` 倒序返回。

请求示例：

```http
GET /api/conversations/search?q=川味
Authorization: Bearer <access_token>
```

响应：

```json
[
  {
    "id": "668000000000000000000001",
    "name": "川味小厨",
    "summary": "",
    "tokenCount": 32,
    "createdAt": "2026-06-28T09:00:00.000Z",
    "updatedAt": "2026-06-28T09:08:00.000Z"
  }
]
```

前端展示建议：
- 搜索框输入变化时做 200-300ms debounce 后调用该接口。
- 空输入时清空搜索结果，或回到普通 conversation list。
- 搜索结果项展示 `name` 和可选的 `updatedAt`。
- 点击结果后设置 `activeConversationId`，再请求消息历史，用户可以衔接之前聊天继续对话。

### 5.5 获取对话消息

```http
GET /api/conversations/:id/messages
Authorization: Bearer <access_token>
```

规则：
- `:id` 必须是 MongoDB ObjectId 字符串。
- 后端会校验 conversation 是否属于当前 userId。
- 返回消息按 `createdAt` 正序排列。

响应：

```json
[
  {
    "id": "668000000000000000000101",
    "conversationId": "668000000000000000000001",
    "role": "user",
    "content": "帮我催一下订单",
    "tokens": 5,
    "createdAt": "2026-06-28T09:01:00.000Z"
  },
  {
    "id": "668000000000000000000102",
    "conversationId": "668000000000000000000001",
    "role": "assistant",
    "content": "您好，已经帮您记录催单诉求。",
    "tokens": 12,
    "createdAt": "2026-06-28T09:01:00.000Z"
  }
]
```

### 5.6 删除对话

```http
DELETE /api/conversations/:id
Authorization: Bearer <access_token>
```

规则：
- 只能删除当前登录用户自己的对话。
- 删除 conversation 时会同步删除该 conversation 下的 messages。

响应：

```json
{ "ok": true }
```

### 5.7 发送聊天消息

```http
POST /api/chat
Authorization: Bearer <access_token>
Content-Type: application/json
```

请求：

```json
{
  "conversationId": "668000000000000000000001",
  "message": "顾客说外卖还没到，帮我回复"
}
```

规则：
- `conversationId.trim()` 不能为空。
- `message.trim()` 不能为空。
- conversation 必须属于当前登录用户。
- 后端会调用 LLM，生成客服回复。
- 流结束后会写入两条消息：`user` 和 `assistant`。
- 返回类型是 `text/event-stream; charset=utf-8`。

当前 SSE 响应格式：

```text
data: 您好，非常抱歉让您久等了，我这边马上帮您催促骑手并关注配送进度。

data: [DONE]

```

前端消费建议：
- 使用 `fetch` + `ReadableStream` 读取响应。
- 按 SSE 的 `data:` 行解析内容。
- 收到 `[DONE]` 后结束本次回复。
- 发送成功后可以重新拉取 `GET /api/conversations/:id/messages`，确保本地状态与后端落库一致。

当前实现说明：
- 后端对外返回 SSE。
- 内部 LLM 请求目前是非 token 级流式请求，拿到完整回复后再以 SSE 返回。
- 后续如需真正 token-by-token streaming，只需要改 `apps/server/src/services/llm.ts` 和 `chat-service` 的流式写入逻辑，API 路径可以保持不变。

## 6. 数据模型

### 6.1 Conversation DTO

前端看到的字段：

```ts
type ConversationDto = {
  id: string;
  name: string;
  summary: string;
  tokenCount: number;
  createdAt: string;
  updatedAt: string;
};
```

MongoDB 文档：

```ts
type ConversationDocument = {
  _id: ObjectId;
  userId: string;
  name: string;
  summary: string;
  tokenCount: number;
  createdAt: Date;
  updatedAt: Date;
};
```

索引：

```js
{ userId: 1, updatedAt: -1 }
```

### 6.2 Message DTO

前端看到的字段：

```ts
type MessageDto = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  tokens: number;
  createdAt: string;
};
```

MongoDB 文档：

```ts
type MessageDocument = {
  _id: ObjectId;
  conversationId: ObjectId;
  userId: string;
  role: "user" | "assistant";
  content: string;
  tokens: number;
  createdAt: Date;
};
```

索引：

```js
{ conversationId: 1, createdAt: 1 }
{ userId: 1, createdAt: -1 }
```

## 7. 鉴权与安全边界

后端鉴权逻辑：
- 从 `Authorization` header 提取 Bearer token。
- 优先兼容 `SUPABASE_JWT_SECRET`，用于旧 HS256 项目。
- 默认通过 `SUPABASE_URL/auth/v1/.well-known/jwks.json` 获取 Supabase JWKS 校验 JWT。
- 校验通过后读取 JWT payload `sub`，写入 Hono context 的 `userId`。
- 所有 conversation/message 查询都带 `userId` 条件。

前端只能持有：
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- 后端 API base URL
- Supabase session access token

前端不能持有：
- `SUPABASE_SERVICE_ROLE_KEY`
- `MONGODB_URI`
- `LLM_API_KEY`
- `ALI_OSS_ACCESS_KEY_SECRET`
- `TAURI_SIGNING_PRIVATE_KEY`
- system prompt

## 8. 环境变量状态

后端运行必需：

```env
PORT=8787
SUPABASE_URL=https://fhtmewbnivxqiyfujgeb.supabase.co
MONGODB_URI=...
MONGODB_DB=zaixiankefu
LLM_BASE_URL=...
LLM_API_KEY=...
LLM_MODEL=gemini-3.1-flash-lite
CONTEXT_TOKEN_LIMIT=8000
KEEP_RECENT_ROUNDS=6
```

已同步到云端但当前 API 代码不直接使用：

```env
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_URL=...
ALI_OSS_REGION=oss-cn-hangzhou
ALI_OSS_ACCESS_KEY_ID=...
ALI_OSS_ACCESS_KEY_SECRET=...
ALI_OSS_BUCKET=...
ALI_OSS_PREFIX=zaixiankefu/
```

后续 Tauri 自动更新阶段需要：

```env
TAURI_SIGNING_PRIVATE_KEY=...
```

注意：
- OSS 原先使用 `oss-accelerate` 会失败，因为当前 bucket 未开启传输加速。
- 已验证可用 OSS region：`oss-cn-hangzhou`。
- OSS 前缀必须固定为 `zaixiankefu/`。

## 9. 前端开发建议

前端建议先封装一个 API client：

```ts
type ApiClientOptions = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
};
```

每次请求流程：
1. 从 Supabase session 获取 `access_token`。
2. 如果没有 token，跳转登录态或清理本地 session。
3. 请求后端时注入 `Authorization: Bearer ${token}`。
4. 如果后端返回 `401`，前端应重新获取 session 或要求用户重新登录。
5. 如果返回 `404`，前端应提示对话不存在或已被删除，并刷新 conversation list。

推荐前端状态：
- `session`：Supabase 当前 session
- `conversations`：对话列表
- `activeConversationId`：当前对话 ID
- `messagesByConversationId`：消息缓存
- `isStreaming`：当前是否有聊天请求进行中
- `streamingText`：当前 assistant 临时输出

推荐 UI 对接顺序：
1. Supabase 邮箱密码登录。
2. 登录后请求 `GET /api/conversations`。
3. 无对话时调用 `POST /api/conversations` 创建默认对话或展示创建弹窗。
4. 选中对话后请求 `GET /api/conversations/:id/messages`。
5. 搜索框输入关键词时调用 `GET /api/conversations/search?q=<keyword>` 展示匹配会话。
6. 点击搜索结果后设置当前会话，并请求该会话消息历史。
7. 发送消息时调用 `POST /api/chat`，解析 SSE。
8. SSE `[DONE]` 后刷新该对话消息列表。

## 10. curl 对接示例

健康检查：

```bash
curl http://127.0.0.1:8787/health
```

获取对话：

```bash
curl http://127.0.0.1:8787/api/conversations \
  -H "Authorization: Bearer <access_token>"
```

搜索对话：

```bash
curl "http://127.0.0.1:8787/api/conversations/search?q=川味" \
  -H "Authorization: Bearer <access_token>"
```

创建对话：

```bash
curl -X POST http://127.0.0.1:8787/api/conversations \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"川味小厨"}'
```

发送聊天：

```bash
curl -N -X POST http://127.0.0.1:8787/api/chat \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"<conversation_id>","message":"帮我回复顾客催单"}'
```

## 11. 已知边界与后续事项

当前后端 API 可供前端开发对接，但仍有以下后续事项：

- 需要前端完成 Supabase 登录，拿真实用户 `access_token` 后做端到端 API smoke test。
- 当前 `/api/chat` 是 SSE 返回，但 LLM 内部调用还不是 token-by-token streaming。
- `CONTEXT_TOKEN_LIMIT`、`KEEP_RECENT_ROUNDS` 已有配置和基础函数，但当前 chat service 尚未把压缩结果写回 conversation summary。
- OSS 环境已连通，但 Tauri 自动更新发布脚本尚未实现。
- `TAURI_SIGNING_PRIVATE_KEY` 尚未配置，等进入 Tauri updater 阶段再处理。
- 生产对外访问还需要 HTTPS 域名或反向代理配置；目前云端健康检查验证的是本机 `127.0.0.1:8787`。
