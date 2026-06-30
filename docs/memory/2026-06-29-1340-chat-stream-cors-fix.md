# 2026-06-29 聊天回复前端显示失败修复

## 问题
- 用户创建测试会话后发送“你好”，前端显示“当前回复生成失败，请稍后重试”。
- 排查发现数据库里已保存用户消息和真实助手回复，说明后端 Mongo、LLM 调用和持久化均已成功。
- 失败发生在前端读取 `/api/chat` SSE 响应阶段。

## 根因
- 自定义 CORS 中间件只处理了 OPTIONS 预检；当下游 route 返回新的 `Response`，真实 SSE 响应缺少 `Access-Control-Allow-Origin`。
- WebView/浏览器因此拒绝把已成功的 `/api/chat` 响应交给前端，前端 catch 后显示通用失败文案。
- 额外发现本机外部环境变量 `MONGODB_DB` 覆盖了项目 `apps/server/.env`，导致后端曾使用非项目库。已改为项目 `.env` 默认覆盖外部环境，避免串库。

## 修复
- `apps/server/src/middleware/cors.ts`
  - 在 `await next()` 后对最终 `c.res.headers` 写入 CORS 头。
  - 继续保持受限来源，不使用 `*`。
- `apps/server/src/middleware/cors.test.ts`
  - 新增真实 SSE response CORS 回归测试。
- `apps/server/src/config/dotenv.ts`
  - `loadLocalEnv()` 默认让项目 `.env` 覆盖外部环境。
  - 保留 `override: false` 选项用于显式保留外部环境。
- `apps/server/src/config/dotenv.test.ts`
  - 覆盖 `.env` 默认覆盖外部环境和 `override:false` 行为。

## 验证
- LLM 直连云雾接口返回 200，模型 `gemini-3.1-flash-lite` 可正常回复。
- 旧问题会话的 Mongo 记录中已存在真实助手回复，确认不是 LLM 失败。
- 后端重启后运行时环境读到 `MONGODB_DB=zaixiankefu`。
- `OPTIONS http://127.0.0.1:8787/api/chat` 携带 `Origin=http://127.0.0.1:5173` 返回 204 和正确 CORS 头。
- `pnpm --filter server test`：13 files / 44 tests passed。
- `pnpm --filter desktop test`：4 files / 25 tests passed。
- `pnpm --filter server build`：通过。
- `pnpm --filter desktop build`：通过。
- `python scripts/verify.py`：5 passed, 0 failed/unenforced。

## 注意
- 修复前用户创建的“测试”会话在旧的 `chengshang_tools` 库中；修复后项目后端使用 `zaixiankefu` 库，需要重新登录/刷新并新建会话测试。
