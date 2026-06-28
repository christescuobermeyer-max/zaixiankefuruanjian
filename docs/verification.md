# 验证矩阵

## 必跑命令
| 验证项 | 命令/方法 | 覆盖约束 | 预期结果 | 当前状态 |
|---|---|---|---|---|
| Harness 约束验证 | `python scripts/verify.py` | 文档、密钥、env、目录、链接 | 0 failures | 初始化阶段必跑 |
| 后端单元测试 | `pnpm --filter server test` | API、auth、Mongo、压缩、LLM prompt | 全部通过 | 后端脚手架后启用 |
| 桌面单元测试 | `pnpm --filter desktop test` | 登录、聊天、panel 状态 | 全部通过 | Tauri 脚手架后启用 |
| 后端构建 | `pnpm --filter server build` | TypeScript 可构建 | 退出码 0 | 后端脚手架后启用 |
| 桌面构建 | `pnpm --filter desktop tauri:build` | Windows 安装包和 updater | 退出码 0 | 桌面脚手架后启用 |
| Secret scan | `python scripts/harness_checks.py no-secrets` | 无真实凭据入仓 | 无命中 | 初始化阶段必跑 |
| Windows 手动验收 | 真实桌面运行 Tauri app | 热区、隐藏、Pin、updater | 符合 UI 文档 | 功能完成后执行 |

## 最终结果验收
1. 在 Windows 桌面启动应用，默认顶部隐藏。
2. 鼠标进入顶部热区或悬停入口后面板展开。
3. 用户使用 Supabase 邮箱密码登录。
4. 创建以店铺名命名的新对话。
5. 发送外卖客服问题，前端显示流式助手回复。
6. 刷新或重启后可读取历史消息。
7. 长对话触发摘要压缩，并保留最近轮次上下文。
8. 自动更新检查从 OSS `zaixiankefu/latest.json` 获取元数据并校验签名。
9. 验证仓库、日志和客户端产物不含真实服务端密钥。

## 无法在初始化阶段验证的事项
- 真实 Tauri 窗口行为，需要桌面脚手架和 Windows 环境。
- 真实 LLM 流式调用，需要用户提供后端 `.env`。
- 真实 MongoDB 写入，需要用户提供测试数据库连接。
- 真实 OSS 上传，需要用户确认 bucket 和发布目标。
