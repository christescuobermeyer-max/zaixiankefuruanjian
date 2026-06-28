# 示例：Tauri 外卖运营日报工具

这是一个填好的端到端范例，对应 `evals/evals.json` 第 1 条。它展示从初始需求到约束、AGENTS.md、验证矩阵的完整形态，供对照使用。**不要把本文件当成模板默认照抄**，每个项目都要按真实需求重新推导。

## 初始需求（用户原话）

> 做一个 Tauri 桌面工具，让外卖运营人员选择店铺后自动读取平台数据、生成日报，并支持后续扩展到美团和淘宝闪购。

## 项目简报

```markdown
## 业务需求
- 用户是谁：外卖店铺运营人员
- 要完成的工作：选店铺 → 拉取平台数据 → 生成日报
- 核心业务流程：登录态下选店铺，按日期拉数据，渲染并导出日报
- 支持的平台：MVP 仅当前已确认的一个平台；美团/淘宝闪购为后续扩展点
- MVP 范围：单平台、单店铺、单日日报、本地导出
- 明确不做：多平台并行、自动定时任务、运营看板、多人协作（均未确认）
- 真实操作风险：读取平台数据涉及登录态与风控，写操作本期不做
- 成功标准：运营选店铺后能拿到当日真实日报并导出
- 最终结果验收标准：用真实测试账号选一个店铺，生成与平台后台一致的当日日报并成功导出文件
```

## 需求-约束追踪表（节选）

| 初始需求片段 | 推导出的约束 | 推导理由 | 验收证据 |
|---|---|---|---|
| “Tauri 桌面工具” | 前端 + Rust command 边界，命令变更同步 capabilities 和 wrapper | Tauri 架构事实 | 源码约束测试通过 |
| “自动读取平台数据” | 读取走只读探针，登录态与 Cookie 脱敏，不做写操作 | 平台风控与安全红线 | secret scan + 日志检查 |
| “支持后续扩展到美团和淘宝闪购” | MVP 只实现已确认的单平台，多平台仅留契约扩展点 | 不扩大范围红线 | 需求评审记录 |
| “生成日报” | 日报字段与平台后台一致，导出文件可被运营打开 | 最终结果验收 | 真实账号手动验收 |

## 约束反馈映射（节选）

| 约束 | 反馈机制 | 证据产物 |
|---|---|---|
| 文档/代码/日志不得出现真实 Cookie 或密钥 | secret scan | 命令输出（无命中） |
| Tauri command 变更同步 capabilities + 前端 wrapper | 源码约束测试 | 测试文件 + 通过结果 |
| MVP 不引入未确认的多平台/定时任务 | 需求对照 review | 评审记录 + diff |
| 日报数据与平台后台一致 | 真实测试账号手动验收 | 截图/导出文件对比 |

## 短版 AGENTS.md（草案）

```markdown
# Agents

## 项目使命
为外卖店铺运营人员提供一个 Tauri 桌面工具：选店铺后读取平台当日数据并生成可导出的日报。

## 技术栈
- 语言与运行时：TypeScript（前端）+ Rust（Tauri 后端），Node 20 开发环境
- 前端：React 18 + Vite + TanStack Query
- 客户端壳：Tauri 2
- 后端/服务端：无独立服务端，平台读取在 Rust 命令侧完成
- 数据库与存储：本地 SQLite 缓存 + 文件系统导出
- 关键依赖与工具：pnpm 包管理，reqwest（Rust HTTP），xlsx 导出库

## 必读文档
- [项目上下文](docs/project-context.md)
- [架构说明](docs/architecture.md)
- [安全模型](docs/security.md)
- [自动化流程](docs/automation-flows.md)

## 硬约束
- 业务：MVP 仅单平台、单店铺、单日日报；多平台为未实现扩展点。
- 架构：平台读取在 Rust 侧，前端只消费命令结果；command 变更同步 capabilities 和 wrapper。
- 安全：登录态/Cookie 不落盘明文，日志脱敏，不内置任何密钥。
- 测试：command 源码约束测试 + 日报字段单元测试 + 真实账号手动验收。

## 权威命令
- 开发：`pnpm tauri dev`
- 测试：`pnpm test`
- 构建：`pnpm tauri build`

## Skill 路由
- 项目级改动前：`project-analyzer`。
- 涉及登录态、Cookie、平台自动化：`security-auditor`。
- 实现前：`test-driven-development`。
- 声称完成前：`verification-before-completion`。

## 文档索引
- [需求](docs/requirements.md)
- [验证](docs/verification.md)
- [记忆](docs/memory/)
```

## 验证矩阵（节选）

| 验证项 | 命令/方法 | 覆盖约束 | 预期结果 |
|---|---|---|---|
| 单元测试 | `pnpm test` | 日报字段正确 | 通过 |
| 源码约束 | command/capabilities 同步检查 | 不漏改边界 | 通过 |
| Secret scan | `rg "Cookie\|token\|secret"` | 无真实凭据 | 无命中 |
| 手动验收 | 真实测试账号选店铺生成日报并导出 | 最终结果 | 与后台一致 |

## 记忆文档落点

最终回复前写入 `docs/memory/2026-06-22-1530-tauri-daily-report.md`（时间用 `date` 实时获取），记录需求、本次完成情况、验证证据、未完成项（多平台扩展）和下一步。
