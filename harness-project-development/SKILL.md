---
name: harness-project-development
description: Use when 用户要从零开发、复刻、重构或规划完整软件项目，需要把业务需求转成项目约束，创建或更新 AGENTS.md，按 Harness Engineering 组织桌面端、Web、云端、RPA、自动化、外部平台、AI 生图或运营工具的开发、验证和交付流程。
---

# Harness 项目开发

## 概览

Harness Engineering 的核心是用约束提高 agent 开发的稳定性。这个 skill 适合放进任意项目目录，尤其是空目录或新仓库初始化时：先把初始需求转成简短、可执行、可验证的项目约束；再把约束、权威路径、命令和文档索引写入 `AGENTS.md`，并建立 `docs/` 骨架。

`SKILL.md` 只作为目录和路由。按当前阶段读取 `references/` 中的详细文档，不要一次性把所有细节塞进主上下文。

## 核心红线

- 先约束，后实现：业务需求没有转成项目约束和反馈机制前，不进入编码。
- 不扩大范围：需求梳理和开发文档中**不得擅自添加**用户没有要求或确认的功能、页面、平台、角色、自动化流程或运营能力。
- 约束必须来自完整初始需求：先完整拆解用户给出的业务需求、明确目标和非目标，再生成与需求挂钩的约束；每条约束都要能追溯到初始需求、用户确认、现有项目事实或明确标注的风险假设，不能凭空生成“看起来合理”的约束。
- `AGENTS.md 是项目 harness 地图`：只放使命、技术栈、硬约束、权威命令、skill 路由和文档索引；详细内容（版本、选型理由、架构细节）放入 `docs/` 或本 skill 的 `references/`。
- 真实密钥不能写入文档、源码、日志、测试、示例或 skill；只能写占位符和环境变量名称。
- 允许 `多 Agent 并发开发`，但只能在需求文档、架构契约、任务边界和验收标准确认后执行；合并后必须整体 review 和验收。
- 每个需求都要写清 `最终结果验收`：以用户要的最终业务结果作为完成标准，不能只用测试通过、代码完成或 agent 自述代替。
- 每次调用本 skill 完成一次项目对话或任务后，都要写入 `docs/memory/` 记忆文档；文件名必须包含当前日期和时间，且时间必须用系统命令获取（如 `date`），不得凭记忆或推测填写。记录本次对话内容、完成情况、验证证据、未完成事项和下一步。
- `同一个问题连续修复 3 次`仍未达到最终结果时，停止继续堆代码；复盘需求、设计、计划、实现、测试、验证、环境和交互流程，并向用户提问重新校准。

## 初始化骨架

当用户给出初始需求、且目标目录还没有成型项目事实时，优先建立下面的骨架，再进入实现：

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
│   ├── progress.md 或 task_plan.md
│   ├── plans/
│   └── memory/
└── README.md (如项目需要)
```

如果是复刻或重构现有项目，先读取并校准已有事实来源，再决定哪些文件是权威来源，哪些文件需要更新或重写。

## 阶段索引

只读取当前任务需要的 reference：

| 阶段 | 读取 |
|---|---|
| 需求梳理、项目约束、反馈机制 | `references/01-requirements-and-constraints.md` |
| 创建或更新 `AGENTS.md`、拆分详细文档 | `references/02-agents-md-and-docs.md` |
| 架构边界、模块契约、跨进程/API/数据库设计 | `references/03-architecture-contracts.md` |
| 外部平台、RPA、真实写操作、安全和密钥 | `references/04-rpa-and-security.md` |
| 实施计划、TDD、单 agent 或多 agent 实现 | `references/05-implementation-and-parallel-agents.md` |
| 验证、最终结果验收、失败修复循环 | `references/06-verification-and-repair-loop.md` |
| 输出格式、模板、检查清单 | `references/07-output-templates.md` |
| 记忆文档、会话记录、跨对话交接 | `references/08-memory-and-session-log.md` |
| 想看一个填好的端到端范例 | `references/examples/tauri-daily-report.md` |

## 子 Skill 路由

开始项目工作前，先读取目标项目已有的 Superpowers 规范。优先读取本 skill 目录下的 `superpowers-agents-guidelines.md`；如果当前 skill 目录未携带该文件，再读取目标项目根目录同名文件，并按其中触发条件判断是否调用对应 skill。

不要把所有任务都升级成完整 Superpowers 流程。小任务、小功能、小文档修正、小范围代码调整，直接在当前会话中读取相关文件、修改、验证即可。只有当任务达到大项目、大重构、大功能、复杂集成、难定位问题或高风险操作时，才启用完整 Superpowers 流程和多 agent 编排。

| 场景 | 使用 |
|---|---|
| 新对话开始、判断本次该调用哪些 skill | `using-superpowers` |
| 空目录初始化、完整项目规划、复刻、重构、大功能设计 | `brainstorming`、`project-analyzer`、按需 `writing-plans` |
| 大项目初始化、理解陌生代码库、复刻现有系统 | `project-analyzer` |
| 多步骤开发计划、大功能计划、跨模块计划 | `writing-plans` |
| 开始独立功能、执行大计划、当前工作区有无关改动需要隔离 | `using-git-worktrees` |
| 核心逻辑、数据处理、API、状态管理、关键用户流程 | `test-driven-development` |
| 难定位 bug、测试失败、异常行为、同一问题多次失败 | `systematic-debugging` |
| 认证、授权、密钥、Cookie、外部平台、安全边界 | `security-auditor` |
| 2 个以上独立研究/实现任务，且任务边界清晰 | `dispatching-parallel-agents` |
| 已确认开发文档后，任务足够大且可拆分并行实现 | `dispatching-parallel-agents` + `subagent-driven-development` |
| 已有实施计划，在当前会话内按计划顺序执行 | `executing-plans` |
| 完成主要功能、合并或交付前请求审查，并理性处理反馈 | `requesting-code-review` + `receiving-code-review` |
| 准备声明完成、修复或通过，且任务有可验证交付物 | `verification-before-completion` |
| 实现完成且验证通过，需要决定 merge、PR、保留分支或清理 | `finishing-a-development-branch` |

小任务规则：

- 单文件文档修正、局部文案、轻量配置说明、少量代码调整，不启动多 agent。
- 小功能可以直接修改和调整，但仍要读取相关上下文、避免越界、运行能证明结果的最小验证。
- 如果小任务过程中发现范围扩大、影响跨模块、涉及安全或无法验证，立即升级到对应流程。

## 最小执行顺序

1. 读取目标项目现有 harness：`AGENTS.md`、`CLAUDE.md`、README、docs、计划、配置、测试和核心代码。
2. 提取业务需求和明确非目标，写出最终结果验收标准。
3. 生成业务、架构、集成、安全、测试、文档、运维约束。
4. 为每条硬约束建立反馈机制：测试、lint、构建、源码约束检查、安全扫描、review 或人工确认。
5. 创建或更新短版 `AGENTS.md`，写清项目真实技术栈（语言、运行时、前端、客户端壳、后端、数据库、关键库），把版本细节和长说明放入 `docs/architecture.md`。
6. 写开发文档、架构契约、验证矩阵和实施计划。
7. 按 TDD 或确认的计划实现；适合并行时再分派多 agent。
8. 合并后按最终结果验收，并把重复错误沉淀为新约束或检查。
9. 在最终回复前写入 `docs/memory/YYYY-MM-DD-HHmm-<topic>.md`，记录本次对话内容和完成情况。

## 第一轮交付

第一次输出时，优先给出这些东西，而不是直接给代码：

- Harness 项目简报。
- 约束集合。
- `AGENTS.md` 修改摘要或新建草案。
- 详细文档地图。
- 架构契约。
- 实施计划。
- 验证矩阵。
- 最终结果验收标准。
- 本次记忆文档路径。

## 最小输出清单

调用此 skill 后，至少产出或更新：

- `AGENTS.md` 修改摘要（含项目真实技术栈栏）。
- 业务需求和最终结果验收标准。
- 项目约束集合。
- 约束反馈映射。
- 详细文档地图。
- 架构契约或待补契约。
- 实施计划和验证矩阵。
- 可运行的约束验证脚手架：`scripts/verify.py` + `docs/constraints.json`（把约束反馈映射落成能跑的检查，见 `references/templates/`）。
- 开放风险与下一步交接。
- `docs/memory/` 中带时间文件名的本次对话记忆文档。

详细模板见 `references/07-output-templates.md`。
