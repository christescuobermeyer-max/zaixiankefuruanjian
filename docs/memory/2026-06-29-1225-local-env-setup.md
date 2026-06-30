# 2026-06-29 本地开发环境变量配置

## 背景
- 用户要求把本地开发环境变量填写完整，并指定读取根目录 `.env`。
- 根目录 `.env` 已存在真实敏感配置；处理过程中只做脱敏检查，未在日志或文档中记录任何密钥原文。

## 处理结果
- 已从根目录 `.env` 同步生成 `apps/server/.env`。
- 已从根目录 `.env` 同步生成 `apps/desktop/.env`。
- `apps/server/.env` 包含后端本地开发所需变量：`PORT`、Supabase URL、MongoDB、LLM、上下文压缩配置；`SUPABASE_JWT_SECRET` 保持可选空值，后端默认使用 Supabase JWKS。
- `apps/desktop/.env` 包含 Vite 客户端所需变量：Supabase URL、Supabase anon key、本地后端地址 `http://127.0.0.1:8787`。
- 发现 `pnpm --filter server dev` 不会自动读取 `.env`，已新增 `apps/server/src/config/dotenv.ts` 并在 `apps/server/src/index.ts` 启动时加载本地 `.env`。
- 新增 `apps/server/src/config/dotenv.test.ts` 覆盖 `.env` 读取和“进程环境优先”行为。

## 验证
- `pnpm --filter server test`：12 files / 40 tests passed。
- `pnpm --filter server build`：通过。
- `pnpm --filter desktop build`：通过。
- `pnpm --filter desktop test`：4 files / 22 tests passed。
- `python scripts/verify.py`：5 passed, 0 failed/unenforced。
- 脱敏运行后端 `loadLocalEnv()` + `loadServerEnv()`：`SERVER_ENV_VALID=true`。
