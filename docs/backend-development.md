# 后端服务器与云数据库开发文档

> 范围：只开发 Node.js + Hono 后端、MongoDB 业务数据库、Supabase Auth/JWT 鉴权、云雾 LLM 流式接口和 Sealos/云服务器部署。Tauri 前端暂不开发。

## 1. 当前结论

- 后端运行在 `apps/server`，使用 TypeScript、Hono、Vitest、MongoDB driver、`jose` 和 AI SDK/OpenAI 兼容 provider。
- 云端数据服务分两类：MongoDB 保存业务对话数据；Supabase 负责用户认证并签发 JWT。
- 所有真实密钥、连接串和 SSH 私钥只进入云端 `.env` 或平台 secret，不写入仓库、文档、测试或日志。
- 已连接 Sealos 云服务器 `devbox@bja.sealos.run:2233`；私钥文件需要放在用户 `.ssh` 目录并设置严格权限。
- 云服务器已安装 Node.js 20、pnpm 和 PM2；后端代码已同步并在云端通过测试和构建。

## 2. 后端职责

### 负责
- `/health` 健康检查。
- Supabase JWT 校验和 `userId` 注入。
- conversation CRUD 和 message 历史读取。
- `/api/chat` 流式聊天、上下文压缩、LLM 调用和 MongoDB 落库。
- MongoDB 集合访问、索引创建和资源级隔离。

### 不负责
- Tauri 窗口、热区、Pin、前端 UI 或本地安全存储。
- 保存客户端 Supabase session。
- 直接暴露 LLM Key、MongoDB URI、Supabase JWT secret 或 OSS Secret。
- 自动更新上传脚本，本阶段先不实现 OSS 发布。

## 3. 云端依赖

| 服务 | 用途 | 后端环境变量 | 安全边界 |
|---|---|---|---|
| Supabase Auth | 邮箱密码登录、JWT 签发 | `SUPABASE_URL`；`SUPABASE_JWT_SECRET` 可选兼容旧 HS256 项目 | 后端优先用 Supabase JWKS 校验 JWT，不保存用户密码。 |
| MongoDB | conversation/message 持久化 | `MONGODB_URI`、`MONGODB_DB` | 所有查询强制按 userId 隔离。 |
| 云雾 LLM | OpenAI 兼容流式回复 | `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL` | Key 只在后端，日志不得输出请求头。 |
| Sealos/云服务器 | 运行后端 API | `.env`、PM2/Node 进程 | SSH 私钥不入仓，生产环境 HTTPS。 |

## 4. API 契约

所有 `/api/*` 接口都需要：

```http
Authorization: Bearer <Supabase JWT>
```

### `GET /health`

响应：

```json
{ "status": "ok" }
```

### `GET /api/conversations`

返回当前用户对话，按 `updatedAt` 倒序。

```json
[
  {
    "id": "string",
    "name": "川味小厨",
    "summary": "",
    "tokenCount": 0,
    "createdAt": "ISO string",
    "updatedAt": "ISO string"
  }
]
```

### `POST /api/conversations`

请求：

```json
{ "name": "川味小厨" }
```

规则：
- `name.trim()` 不能为空。
- 返回 201。

### `GET /api/conversations/:id/messages`

规则：
- 先校验 conversation 属于当前 userId。
- 返回按 `createdAt` 正序的 messages。

### `DELETE /api/conversations/:id`

规则：
- 只能删除当前用户自己的 conversation。
- 同步删除该 conversation 下 messages。

响应：

```json
{ "ok": true }
```

### `POST /api/chat`

请求：

```json
{
  "conversationId": "string",
  "message": "用户问题"
}
```

响应：
- `text/event-stream`
- 流结束后写入 user message 和 assistant message。

处理顺序：
1. 校验 JWT 并取得 userId。
2. 校验 conversation 归属。
3. 读取 summary 和最近消息。
4. 超过 `CONTEXT_TOKEN_LIMIT` 时摘要压缩较早消息。
5. 构造 system prompt、summary、recent messages 和本次 user message。
6. 调用云雾 LLM 流式返回。
7. 流结束后落库并更新 conversation。

## 5. MongoDB 数据模型

### `conversations`

```json
{
  "_id": "ObjectId",
  "userId": "string",
  "name": "string",
  "summary": "string",
  "tokenCount": 0,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

索引：
- `{ userId: 1, updatedAt: -1 }`

### `messages`

```json
{
  "_id": "ObjectId",
  "conversationId": "ObjectId",
  "userId": "string",
  "role": "user | assistant",
  "content": "string",
  "tokens": 0,
  "createdAt": "Date"
}
```

索引：
- `{ conversationId: 1, createdAt: 1 }`
- `{ userId: 1, createdAt: -1 }`

## 6. 文件结构

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
    ├── services/context-compaction.ts
    ├── services/llm.ts
    ├── prompts/customer-service.ts
    └── types/domain.ts
```

测试文件与被测文件放在同目录，命名为 `*.test.ts`。

## 7. 环境变量

`apps/server/.env.example` 是唯一可提交模板。

```dotenv
PORT=8787
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
MONGODB_URI=${MONGODB_URI}
MONGODB_DB=zaixiankefu
LLM_BASE_URL=https://yunwu.ai/v1
LLM_API_KEY=${LLM_API_KEY}
LLM_MODEL=gemini-3.1-flash-lite
CONTEXT_TOKEN_LIMIT=8000
KEEP_RECENT_ROUNDS=6
```

生产 `.env` 只放在云服务器或平台 secret 中。

## 8. 本地开发命令

```bash
pnpm install
pnpm --filter server dev
pnpm --filter server test
pnpm --filter server build
python scripts/verify.py
```

## 9. 云服务器部署步骤

连接前提：
- 需要有效 SSH 私钥文件。
- 已确认目标：`devbox@bja.sealos.run:2233`。
- Windows OpenSSH 要求私钥权限足够严格；建议复制到 `%USERPROFILE%\.ssh\zaixiankefu_devbox_ed25519` 后限制 ACL。

部署命令模板：

```bash
ssh -i <private-key-file> -p 2233 devbox@bja.sealos.run
cd zaixiankefuruanjian
pnpm install
cp apps/server/.env.example apps/server/.env
```

编辑 `apps/server/.env` 时只在服务器本地填写真实值。

启动：

```bash
pnpm --filter server build
pm2 start apps/server/dist/index.js --name zaixiankefu-api
pm2 save
```

健康检查：

```bash
curl http://127.0.0.1:8787/health
```

## 10.1 当前云端状态

- 服务器路径：`/home/devbox/zaixiankefuruanjian`
- 已安装：Node.js 20.20.2、npm 10.8.2、pnpm 10.34.4、PM2 7.0.1。
- 已执行：`pnpm install --frozen-lockfile`
- 已执行：`pnpm --filter server test`，结果 11 个测试文件、29 个测试通过。
- 已执行：`pnpm --filter server build`，结果 TypeScript 构建通过。
- 已启动 PM2 服务：`zaixiankefu-api`。
- 已执行健康检查：`GET http://127.0.0.1:8787/health` 返回 `{ "status": "ok" }`。
- 已执行云端依赖核对：
  - Supabase Auth/JWKS：OK，JWKS 返回 1 把 key。
  - MongoDB：OK，数据库 `zaixiankefu` 可 ping，集合包含 `conversations,messages`。
  - LLM API：OK，模型 `gemini-3.1-flash-lite` 可完成最小 chat 请求。
  - Supabase Database：未配置运行时 key；当前后端不直接访问 Supabase Database。
  - 阿里云 OSS：未配置，缺少 `ALI_OSS_*` 环境变量和 `ali-oss` 依赖；自动更新发布脚本不属于当前后端 API 阶段。

## 10. 验收标准

- `pnpm --filter server test` 全部通过。本地结果：11 个测试文件、29 个测试通过；云端结果：11 个测试文件、29 个测试通过。
- `pnpm --filter server build` 退出码为 0。本地和云端均已通过。
- `python scripts/verify.py` 通过。
- 本地或云端 `/health` 返回 `{ "status": "ok" }`。
- 用测试 JWT 可以创建 conversation、读取列表、写入消息。
- MongoDB 中 `conversations`、`messages` 写入正确且按 userId 隔离。
- `/api/chat` 在 mock LLM 测试中能流式返回并落库；真实 LLM 调用需要用户提供有效云端 `.env` 后验收。

## 11. 开放问题

- “两个云数据库”当前按 MongoDB 业务库 + Supabase Auth/JWT 理解；如果用户实际还有第二个 MongoDB/Postgres/MySQL 实例，需要补充服务类型、连接方式、schema 和用途。
- 已确认 Supabase URL：`https://fhtmewbnivxqiyfujgeb.supabase.co`。后端可通过该 URL 的 JWKS 端点验证 Supabase JWT；`SUPABASE_JWT_SECRET` 不再是启动必需项。
- 仍需在云端 `.env` 填入已轮换的 MongoDB URI 和 LLM API Key 后才能启动真实服务。
