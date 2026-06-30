# 2026-06-29 前端 API 对接记录

## 本次完成
- 新增桌面端 `src/api.ts`，封装 Supabase 邮箱密码登录、后端 conversation CRUD/search/stats/messages 和 `/api/chat` SSE 调用。
- 桌面 App 登录后使用 Supabase JWT 调后端，加载对话列表、店铺统计和首个对话消息。
- 新建对话、搜索对话、删除对话、发送消息已从原型本地逻辑切到后端 API。
- 发送消息使用后端 SSE，前端按 chunk 更新流式回复，完成后落到当前对话。
- 后端 chat service 修复多行文本 SSE 格式，避免前端解析时丢失换行后的内容。

## 安全边界
- 客户端只读取 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`VITE_BACKEND_URL`。
- LLM Key、MongoDB URI、Supabase JWT secret 仍只在后端环境变量中读取。
- 测试中使用 mock token 和 mock API，不引入真实密钥。

## 验证
- 已新增桌面 `api.test.ts` 覆盖所有前端 API client 方法。
- 已更新 `App.test.tsx` 覆盖登录、加载对话/消息、搜索、新建、删除和 SSE 发送。
- 已新增后端 chat service SSE 多行格式测试。
