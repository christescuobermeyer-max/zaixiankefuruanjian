# harness-project-development

一个面向 **Codex** 的 agent skill 包。它用 Harness Engineering 的方式，把业务需求先转成可执行、可验证的项目约束，再写入 `AGENTS.md` 和 `docs/` 骨架，最后用验证矩阵和记忆文档收尾。核心是：先约束，后实现；不扩大范围；以用户要的最终结果验收。

## 入口

从 [SKILL.md](SKILL.md) 开始。它只做目录和路由，按当前阶段读取 `references/` 中的详细文档，不要一次性全部塞进上下文。

## 结构

```text
harness-project-development/
├── SKILL.md                      # 入口：核心红线、阶段索引、子 skill 路由
├── superpowers-agents-guidelines.md  # Superpowers 工作流规范与触发条件（无前缀 skill 名）
├── README.md
├── references/
│   ├── 01-requirements-and-constraints.md
│   ├── 02-agents-md-and-docs.md
│   ├── 03-architecture-contracts.md
│   ├── 04-rpa-and-security.md
│   ├── 05-implementation-and-parallel-agents.md
│   ├── 06-verification-and-repair-loop.md
│   ├── 07-output-templates.md
│   ├── 08-memory-and-session-log.md
│   ├── examples/
│   │   └── tauri-daily-report.md   # 填好的端到端范例
│   └── templates/                  # 复制进目标项目的可运行脚手架
│       ├── verify.py               # 约束→可跑检查的项目级验证器
│       └── constraints.example.json
├── evals/
│   └── evals.json                # 行为评测用例（每条带 rubric）
└── scripts/
    ├── validate.py               # 结构 / 自洽性 / 密钥自校验
    └── score_evals.py            # 按 rubric 给 agent 回答打分
```

`references/` 已有 8 个文件，触及“每目录 ≤8 文件”上限；新增参考请放进子目录（如 `references/examples/`），不要直接加第 9 个文件。

## 命名约定

所有 skill 引用使用**无前缀**名（`brainstorming`、`writing-plans`、`test-driven-development` 等）。`superpowers-agents-guidelines.md` 与 SKILL.md 路由表保持同一套命名和同一组 skill。

## 校验与度量

```bash
python scripts/validate.py            # 结构 + 自洽性 + 密钥
python scripts/score_evals.py         # lint：每条 eval 都带合法 rubric
python scripts/score_evals.py --responses out.json   # 按 rubric 给回答打分
```

`validate.py` 除结构外还做**自洽性**检查，兑现 skill 自己的承诺：路由 skill 无孤儿、无 `superpowers-` 前缀、harness 地图模板保留全部必备小节（含 `技术栈`）、核心红线保留记忆文档与“系统命令取时间戳”规则、每条 eval 都带 rubric、全包无疑似真实密钥。

`score_evals.py` 让 skill **可度量**：每条 eval 带 `rubric.must_include / must_avoid`；传入 `out.json`（`{"1":"agent 回答", ...}`）即按粗粒度子串规则打分。要更准可把 `grade_one` 换成 LLM judge。

## 项目级脚手架

`references/templates/` 里的 `verify.py` 和 `constraints.example.json` 是**复制进目标项目**的产物：把约束反馈映射落成 `docs/constraints.json` + `scripts/verify.py`，让“每条硬约束都有能跑的检查”从表格变成命令。没有 `check` 的约束会被标为 UNENFORCED 并失败。
