# 外卖在线客服 AI 桌面助手

本仓库用于开发一个 Tauri 2 + React + Node/Hono 的 Windows 桌面客服助手。当前状态为项目初始化：已建立 harness 文档、约束验证脚手架、环境变量占位文件和工作区目录边界。

## 当前权威入口

- 项目规则：`AGENTS.md`
- 业务与技术文档：`docs/项目开发文档.md`
- 前端设计：`docs/前端UI设计文档.md`
- 实施计划：`docs/plans/2026-06-28-外卖客服桌面助手实施计划.md`
- 验证命令：`python scripts/verify.py`

## 安全提醒

真实密钥、连接串、SSH 私钥、OSS Secret、LLM Key 和 Supabase token 不得写入仓库。历史初始需求文件已按本地敏感文件处理，正式上线前必须轮换已泄露凭据。
