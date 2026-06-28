# 安全模型

## 安全红线
- 不把真实密钥、连接串、SSH 私钥、Cookie、token、平台签名或完整敏感日志写入仓库。
- 客户端不得包含 LLM Key、MongoDB URI、OSS AccessKey Secret、Supabase JWT secret 或 service-role key。
- 初始资料中已经出现过的凭据必须在上线前轮换。
- 生产后端认证配置缺失时必须 fail closed。

## 密钥与环境变量

### 后端
- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET`（可选；默认通过 Supabase JWKS 校验 JWT）
- `MONGODB_URI`
- `MONGODB_DB`
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- `CONTEXT_TOKEN_LIMIT`
- `KEEP_RECENT_ROUNDS`

### 客户端
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BACKEND_URL`

### 发布环境
- `ALI_OSS_REGION`
- `ALI_OSS_ACCESS_KEY_ID`
- `ALI_OSS_ACCESS_KEY_SECRET`
- `ALI_OSS_BUCKET`
- `ALI_OSS_PREFIX=zaixiankefu/`
- `TAURI_SIGNING_PRIVATE_KEY`

## 认证与授权
- Supabase 登录发生在客户端。
- 后端只接受 `Authorization: Bearer <JWT>`。
- JWT 校验后取 `sub` 作为 userId。
- 所有 conversation 和 message 读取、写入、删除都必须按 userId 限制。

## 日志与错误
- 日志中不得输出 token、连接串、用户密码、完整供应商响应头或私钥。
- 用户可见错误应说明可恢复动作，不暴露内部 key、prompt 或数据库细节。

## 真实操作门禁
- OSS 上传、自动更新发布、生产数据库写入和凭据轮换必须由用户确认执行目标环境。
- smoke test 默认使用隔离测试资源。

## 安全反馈机制
- `python scripts/harness_checks.py no-secrets` 检查常见密钥、连接串和私钥模式。
- `docs/constraints.json` 记录每条硬约束对应的可运行检查。
- 发布前补充依赖审计、Tauri capability 检查和 updater 签名验证。
