# Agents

## 项目使命
构建一个面向外卖商家客服工作的 Windows 桌面 AI 助手：Tauri 顶部自动隐藏面板提供登录、多对话管理和流式客服回复，后端统一处理鉴权、LLM 调用、上下文压缩、MongoDB 持久化和 OSS 自动更新发布。

## 技术栈
- 语言与运行时：TypeScript、Rust、Node.js 20+。
- 前端：React、TypeScript、Vite、Vercel AI SDK、prompt-kit。
- 客户端/桌面壳：Tauri 2.x，目标平台为 Windows。
- 后端/服务端：Node.js、TypeScript、Hono、SSE。
- 数据库与存储：MongoDB `zaixiankefu`、Supabase Auth、阿里云 OSS `zaixiankefu/` 更新前缀。
- 关键依赖与工具：pnpm workspace、Vitest、@tauri-apps/plugin-updater、ali-oss、jose。

## 必读文档
- [项目上下文](docs/project-context.md)
- [需求与约束](docs/requirements.md)
- [架构说明](docs/architecture.md)
- [后端开发文档](docs/backend-development.md)
- [安全模型](docs/security.md)
- [验证矩阵](docs/verification.md)
- [实施计划](docs/plans/2026-06-28-外卖客服桌面助手实施计划.md)
- [原始开发文档](docs/项目开发文档.md)
- [前端 UI 设计](docs/前端UI设计文档.md)

## 硬约束
- 每次回复都必须使用中文回复。
- MVP 只做 Windows 桌面助手、邮箱密码登录、命名对话、文本流式客服、MongoDB 持久化、上下文压缩和 OSS 自动更新；不做移动端、语音、图片、多租户或本地模型。
- 客户端不得接触 LLM Key、MongoDB URI、OSS Secret、Supabase service token 或 system prompt；服务端密钥只从环境变量或受控 secret 读取。
- 所有后端用户数据查询必须按 Supabase `sub` 派生的 `userId` 做资源级隔离。
- Tauri command、capability、前端 wrapper 和 UI 调用必须同步设计和测试，不能只改其中一层。
- OSS 更新文件必须上传到 `zaixiankefu/` 子目录，不能与其他项目更新文件混用。
- 新增环境变量必须同步 `.env.example`、安全文档和验证矩阵。
- 实现核心逻辑、API、状态管理和跨边界行为时使用 TDD；声明完成前运行 `python scripts/verify.py` 和相关测试/构建。

## 权威命令
- 约束验证：`python scripts/verify.py`
- 安装依赖：`pnpm install`（package manifest 完成后）
- 后端开发：`pnpm --filter server dev`（后端脚手架完成后）
- 桌面开发：`pnpm --filter desktop dev`（Tauri 脚手架完成后）
- 后端测试：`pnpm --filter server test`
- 桌面测试：`pnpm --filter desktop test`
- 构建：`pnpm --filter server build` 与 `pnpm --filter desktop tauri:build`

## Skill 路由
- 每次新任务先用 `using-superpowers` 判断流程。
- 项目级改动、初始化、复刻或陌生代码分析前使用 `project-analyzer`。
- 新功能、行为变更或产品设计前使用 `brainstorming`；已有确认文档时以 `docs/` 和实施计划为准。
- 多步骤开发按 `docs/plans/` 使用 `executing-plans` 或 `subagent-driven-development`。
- 核心逻辑、API、状态管理和关键用户流程使用 `test-driven-development`。
- 遇到测试失败或异常行为使用 `systematic-debugging`。
- 涉及认证、授权、密钥、对象存储、发布或外部平台写操作时按 [安全模型](docs/security.md) 执行安全审查；若 `security-auditor` skill 可用则必须调用。
- 声称完成、修复或测试通过前使用 `verification-before-completion`。

## 文档索引
- [需求](docs/requirements.md)
- [架构](docs/architecture.md)
- [后端开发](docs/backend-development.md)
- [安全](docs/security.md)
- [外部自动化/平台流程](docs/automation-flows.md)
- [验证](docs/verification.md)
- [进度交接](docs/progress.md)
- [约束反馈配置](docs/constraints.json)
- [记忆](docs/memory/)
