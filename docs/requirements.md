# 需求与约束

## 已确认需求
| ID | 需求 | 来源 | 最终结果验收 |
|---|---|---|---|
| R1 | Windows 桌面顶部自动隐藏客服面板 | `docs/项目开发文档.md` G1 | 鼠标进入顶部热区或悬停图标可展开，失焦/离开后可隐藏，Pin 后不隐藏。 |
| R2 | 通过后端接入第三方 LLM 并流式回复 | `docs/项目开发文档.md` G2 | 前端看到连续流式输出，客户端不暴露 LLM Key。 |
| R3 | Supabase 邮箱密码登录和 JWT 鉴权 | `docs/项目开发文档.md` G3 | 未登录不能访问受保护 API；登录后请求携带 JWT 并通过后端校验。 |
| R4 | 对话原文持久化到 MongoDB | `docs/项目开发文档.md` G4 | 每轮 user/assistant 消息可重新读取，并按 userId 隔离。 |
| R5 | token 超阈值后自动摘要压缩上下文 | `docs/项目开发文档.md` G5 | 长对话发送前触发摘要，summary 写入 conversation，最近轮次保留原文。 |
| R6 | Tauri Updater 使用阿里云 OSS 独立子目录 | `docs/项目开发文档.md` G6 | 更新元数据与安装包位于 `zaixiankefu/` 前缀，签名校验通过。 |
| R7 | 支持多对话管理和新建对话命名 | `docs/项目开发文档.md` G7 | 用户可以新建以店铺名区分的对话，并在列表中切换历史上下文。 |

## 非目标
- 不做多租户/团队协作。
- 不做移动端。
- 不做语音或图片多模态。
- 不做本地离线模型。

## 项目约束

### 业务约束
- MVP 只覆盖外卖在线客服文本工作流。
- UI、文案和默认流程必须服务高频客服使用，不加入无关运营、CRM 或团队协作能力。

### 架构约束
- 客户端为 Tauri 2 + React/Vite；后端为 Node.js + Hono；数据库为 MongoDB。
- LLM、MongoDB、OSS 和鉴权敏感配置只存在服务端、CI 或受控发布环境。
- API、Tauri command、前端 wrapper、数据库 schema 和环境变量变更必须同步契约文档。

### 集成约束
- 云雾 LLM 使用 OpenAI 兼容接口，由后端封装。
- OSS 更新前缀固定为 `zaixiankefu/`。
- Supabase JWT 校验失败必须 fail closed，返回 401。

### 安全约束
- 真实密钥、连接串、SSH 私钥、Cookie、token 和签名不得进入仓库、日志、测试或文档。
- 初始资料中已经出现过的凭据上线前必须轮换。
- 所有对话和消息查询必须按 userId 过滤，防止串库。

### 测试约束
- 后端路由、中间件、Mongo 服务、上下文压缩和 LLM prompt 必须有 Vitest 测试。
- 前端登录、对话弹窗、聊天主面板和 panel 状态机必须有组件或纯逻辑测试。
- 自动更新发布脚本必须测试 OSS key 前缀和 `latest.json` 结构。
- 声称完成前必须运行约束验证脚手架和相关测试/构建。

### 文档约束
- `AGENTS.md` 只保留使命、技术栈、约束、命令和索引。
- 详细需求、架构、安全、验证和进度放入 `docs/`。
- 每次项目级任务结束前写入 `docs/memory/`。

### 运维约束
- 开发/构建/发布命令必须写入文档并可被验证。
- 真实发布、更新上传或破坏性操作前必须人工确认。

## 需求-约束追踪表
| 初始需求片段 | 推导出的约束 | 推导理由 | 验收证据 |
|---|---|---|---|
| 桌面顶部自动隐藏面板 | Tauri 窗口、热区和 Pin 状态必须按契约同步实现 | 面板交互是核心目标 G1 | 桌面手动验收 + panel 状态机测试 |
| 接入第三方 LLM | LLM Key 只允许服务端持有 | 客户端泄露供应商 Key 风险高 | secret scan + 客户端源码检查 |
| 登录鉴权 | 后端 API 必须校验 JWT 并注入 userId | 数据隔离依赖认证身份 | auth 中间件测试 |
| 对话持久化 | conversation/messages schema 和索引固定 | 历史恢复和多对话依赖数据模型 | Mongo service/route 测试 |
| 自动更新 | OSS key 必须带 `zaixiankefu/` 前缀 | 避免与其他项目更新文件混淆 | 发布脚本测试 + constraint check |

## 约束反馈映射
| 约束 | 反馈机制 | 证据产物 |
|---|---|---|
| 文档和代码不得出现真实密钥 | `python scripts/harness_checks.py no-secrets` | 无命中输出 |
| 必需 harness 文档存在 | `python scripts/harness_checks.py required-files` | 文件存在检查 |
| `.env.example` 与安全边界同步 | `python scripts/harness_checks.py env-examples` | 变量名检查 |
| `AGENTS.md` 链接不失效 | `python scripts/harness_checks.py docs-links` | 链接目标检查 |
| 项目目录结构符合计划 | `python scripts/harness_checks.py planned-structure` | 目录/文件存在检查 |
