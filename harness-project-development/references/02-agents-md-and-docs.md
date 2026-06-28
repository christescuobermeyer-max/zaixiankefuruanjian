# 02. AGENTS.md 与文档拆分

## 原则

`AGENTS.md 是项目 harness 地图`，不是详细手册。它要短、稳定、可执行，用来告诉 future agent：项目使命是什么、硬约束是什么、权威命令是什么、遇到不同任务该读哪里和用哪个 skill。

长背景、研究过程、接口细节、抓包行为、截图、排障历史、日志和模板都应放入 `docs/`、`references/` 或专项文档。

## AGENTS.md 推荐结构

```markdown
# Agents

## 项目使命
[一段话说明：这个系统为谁解决什么问题。]

## 技术栈
- 语言与运行时：[如 TypeScript / Rust / Node 20]
- 前端：[框架 + UI 库 + 状态管理，或“无”]
- 客户端/桌面壳：[如 Tauri 2 / Electron / 浏览器 / 无]
- 后端/服务端：[框架 + 运行环境，或“无”]
- 数据库与存储：[如 SQLite / Supabase / OSS，或“无”]
- 关键依赖与工具：[影响架构的核心库、包管理器、构建工具]

## 必读文档
- [项目上下文](docs/project-context.md)
- [架构说明](docs/architecture.md)
- [开发计划](docs/plans/)
- [安全模型](docs/security.md)

## 硬约束
- [业务边界]
- [架构边界]
- [安全边界]
- [测试边界]
- [运维边界]

## 权威命令
- 安装：
- 开发：
- 测试：
- Lint：
- 构建：
- 发布：

## Skill 路由
- 项目初始化或项目级改动前，使用 `project-analyzer`。
- 涉及认证、密钥、Cookie、支付、平台自动化或发布前，使用 `security-auditor`。
- 实现前，使用 `test-driven-development`。
- 声称完成前，使用 `verification-before-completion`。

## 文档索引
- [需求](docs/requirements.md)
- [计划](docs/plans/)
- [验证](docs/verification.md)
- [记忆](docs/memory/)
- [交接](task_plan.md)
```

## 写入规则

- 必须写当前真实技术栈：语言、运行时、前端框架、客户端壳、后端、数据库、关键库和包管理器，用项目实际选型的具体名称，不能只写“前端/后端”这类占位。技术栈或平台变更后要同步更新这一栏。完整版本号、备选方案和选型理由放 `docs/architecture.md`，`AGENTS.md` 只列当前实际使用的栈，保持可一眼读懂。
- 只写约束、路径、命令和索引。
- 不写长篇解释、复制研究、原始 HAR、日志、凭据、Cookie、token、密码、连接串。
- 如果项目已经把 `CLAUDE.md` 当作当前事实来源，要么在 `AGENTS.md` 中引用它，要么把简短事实迁移进 `AGENTS.md`；不要制造多个互相冲突的事实来源。
- 如果文档与代码不一致，新增文档/测试修复任务，不要直接复制过期说法。
- 如果 `AGENTS.md` 膨胀成手册，立即拆分：保留约束和链接，把细节移入 `docs/`。

## 详细文档地图

按需要创建或更新这些文档：

| 文件 | 用途 |
|---|---|
| `docs/project-context.md` | 业务流程、领域术语、用户、MVP、非目标 |
| `docs/requirements.md` | 已确认需求、约束、最终结果验收标准 |
| `docs/architecture.md` | 技术栈选型（含版本与理由）、模块图、数据流、进程边界、IPC/API 契约 |
| `docs/security.md` | 认证、密钥、Cookie、日志、存储、权限、威胁模型 |
| `docs/automation-flows.md` | RPA/API/探针规则、证据、平台专项约束 |
| `docs/plans/YYYY-MM-DD-<topic>.md` | 带测试和命令的可执行实施计划 |
| `docs/verification.md` | 开发、发布、真实操作前必跑检查 |
| `docs/memory/YYYY-MM-DD-HHmm-<topic>.md` | 按时间记录每次对话内容、完成情况、验证证据、未完成事项和下一步 |
| `task_plan.md` 或 `docs/progress.md` | 当前状态、完成项、阻塞项、下一步交接 |
| `references/` | 有用的外部研究、长资料和专项参考，但不能替代当前代码事实 |

## 最小初始化骨架

如果目标目录是空目录、新仓库，或只有少量代码但没有可用项目 harness，先创建最小骨架：

```text
project-root/
├── AGENTS.md
├── docs/
│   ├── project-context.md
│   ├── requirements.md
│   ├── architecture.md
│   ├── security.md
│   ├── automation-flows.md
│   ├── verification.md
│   ├── progress.md
│   ├── plans/
│   └── memory/
└── README.md
```

创建规则：

- `AGENTS.md` 放项目使命、硬约束、权威命令、skill 路由和文档索引。
- `docs/project-context.md` 放业务流程、用户、术语、MVP、非目标。
- `docs/requirements.md` 放已确认需求、约束和最终结果验收标准。
- `docs/architecture.md` 放技术栈选型（语言、框架、运行时、数据库、关键库的具体名称、版本与理由）、模块边界、数据流、API/IPC/数据库契约。
- `docs/security.md` 放认证、授权、密钥、日志、外部平台和真实操作门禁。
- `docs/automation-flows.md` 只在涉及 RPA、外部平台或批量自动化时创建；否则写明“不适用”或暂缓。
- `docs/verification.md` 放验证矩阵、命令、人工验收步骤和无法验证项。
- `docs/plans/` 放实施计划；计划必须能按任务执行。
- `docs/memory/` 放每次对话结束后的记忆文档，文件名必须包含日期和时间，例如 `2026-06-22-1530-project-init.md`。
- `docs/progress.md` 或 `task_plan.md` 放交接状态；二选一即可，避免事实来源分裂。

## 长周期交接文档

长周期项目必须维护交接文档，内容包括：

- 当前目标和范围。
- 已完成任务。
- 进行中任务。
- 阻塞事项，以及谁或什么能解除阻塞。
- 已运行的验证，包含日期或命令名。
- 新 agent 接手后的下一步安全动作。

## 记忆文档

每次调用本 skill 完成一次项目对话或任务后，都要创建或更新 `docs/memory/` 中的本次记忆文档。记忆文档是跨对话上下文，不是代码事实来源；如果它和当前代码、测试、配置冲突，以可运行事实为准。

命名规则：

- 使用当前本地时间：`docs/memory/YYYY-MM-DD-HHmm-<topic>.md`。
- 同一分钟内多次写入时追加秒：`docs/memory/YYYY-MM-DD-HHmmss-<topic>.md`。
- `<topic>` 用简短英文或拼音 slug；未知主题用 `session`。
- `AGENTS.md` 只索引 `docs/memory/`，不要把每篇记忆内容复制进 `AGENTS.md`。

## 文档一致性

- `AGENTS.md` 指向当前权威文档，不复制大段内容。
- `docs/` 解释细节，计划和验证命令要能落地。
- 代码、测试和配置与文档冲突时，以可运行事实为准，并补文档修复任务。
- 文档更新后，检查 skill 路由、命令和路径是否仍然准确。
