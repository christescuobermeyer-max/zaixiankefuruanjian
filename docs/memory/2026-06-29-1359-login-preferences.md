# 2026-06-29 13:59 登录记住密码与自动登录

## 背景
- 用户要求登录界面新增「记住密码」和「自动登录」勾选框，并且默认都勾选。
- 当前桌面端登录走 Supabase password token API，前端之前没有本地登录偏好存储。

## 实现
- 新增 `apps/desktop/src/authPreferences.ts`，统一读写 `zaixiankefu.loginPreferences`。
- 登录页新增「记住密码」「自动登录」两个复选框，默认勾选，并接入绿色主题样式。
- 登录成功后，如「记住密码」启用，则保存邮箱、密码和两个勾选状态到本机 localStorage。
- 取消「记住密码」时立即关闭「自动登录」并清除已保存的登录偏好。
- 应用启动后读取本地偏好；当自动登录开启且本地有邮箱密码时，在后台调用现有登录流程。桌面窗口仍保持顶部隐藏按钮，用户展开后进入已登录界面。

## 验证
- `pnpm --filter desktop test`：35 个测试通过。
- `pnpm --filter desktop build`：通过。
- `python scripts/verify.py`：5 项通过。

## 安全备注
- 本次按用户确认的需求实现本机记住密码；凭据只保存在当前机器的 localStorage，不写入仓库、日志或文档。
- 后续若用于正式生产，建议改为 Tauri 系统凭据管理或 Windows Credential Manager，避免前端明文保存密码。
