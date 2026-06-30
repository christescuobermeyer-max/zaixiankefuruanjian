# 2026-06-30 15:29 客服回复优化、退出按钮、聊天体验与 0.1.4/0.1.5 发布

## 背景
- 用户反馈线上 AI 客服回复太长、空行分多段、显得假；要求简短单段。
- 用户要求新增「退出软件」按钮。
- 用户反馈每条回复都带 `@老板` 和称谓，要去掉；聊天窗口不自动滚动；「正在生成回复」是固定文本，要换成加载动画。
- 用户要求整体上线：提交、部署后端、构建并发布桌面自动更新。

## 实现

### 后端（apps/server）
- `prompts/customer-service/main.md`：回复结构改为「一整段连续的话、简短两三句」，删除「可分条发送」；删除「@老板姓名」引导，改为「不要 @ 任何人、不要用『老板』等称呼开头」。
- `prompts/customer-service/knowledge/retention-contract.md`：范文去掉 `@老板` 和称呼。
- `services/llm.ts` 新增并导出 `normalizeReply()`：把换行/空行折叠成单段，并剥离开头的 `@提及` 与「老板」称谓；`completeWithLlm` 返回前调用它。对应 `llm.test.ts` 增加用例。

### 桌面（apps/desktop）
- `icons.tsx` 新增 `CloseIcon`；`App.tsx` 标题栏 `.title-actions` 在固定/隐藏后新增「退出软件」按钮，调用 `@tauri-apps/plugin-process` 的 `exit(0)`（`isTauriRuntime()` 守卫，浏览器预览安全降级）；`App.css` 加 `.title-btn-danger` 红色悬停。`process:default` 已含 `allow-exit`，无需改 capabilities。
- `ChatArea` 加滚动容器 ref + `useEffect`，消息数量/流式文本/切换会话时自动滚到底部。
- 新增 `TypingDots` 组件（三点 `dotpulse` 脉冲动画）+ `.typing-dots` 样式，流式回复未出首字时显示加载动画，替代固定文本「正在生成回复」。

## 发布
- 桌面 0.1.3 → 0.1.4（退出按钮 + 单段简短回复相关前端）→ 0.1.5（去 @/称谓兜底无前端影响，主要是自动滚动 + 加载动画）。版本号同时改 `tauri.conf.json`、`Cargo.toml`、`Cargo.lock`。
- 后端走云服务器部署，不经桌面自动更新；前端走 OSS 自动更新。
- 线上 OSS endpoint：`https://shiping-1-2.oss-cn-hangzhou.aliyuncs.com/zaixiankefu/latest.json`，发布前已是 0.1.3，本次依次发布 0.1.4、0.1.5。

## 构建环境（重要操作知识）
- 本机 `tauri build` 需要 MSVC C++ 工具集 + Windows SDK 环境。
- `vswhere -prerelease -latest` 会选中 **VS 18 Insiders**，但其 `VC\Tools\MSVC\14.50.35717\include` 为空、缺 `vcruntime.h`/`excpt.h`，构建会失败。
- 正确做法：用 **VS 2022 Community** 的 `C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat`（完整工具集 14.44）。可用临时 bat：`call vcvars64.bat && cd apps/desktop && pnpm tauri:build`，签名变量经 PowerShell 进程环境继承。
- 签名私钥 `.tauri-keys/zaixiankefu.key`（gitignore），**无密码**（`TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""`）。
- `release.mjs` 不会自己加载 `.env`，发布前需手动把根 `.env` 的 `ALI_OSS_*` 载入环境；默认 dry-run，`--confirm` 才真实上传。

## 云服务器部署
- 服务器 `devbox@bja.sealos.run:2233`，代码在 `/home/devbox/zaixiankefuruanjian`，**非 git 仓库**（早期 tar 同步）。
- 部署方式：本地 `tar -czf` 打包 `apps/server/src` → `scp` 上传 → 服务器 `tar -xzf` 覆盖 → `pnpm --filter server build` → `pm2 restart zaixiankefu-api`（不加 `--update-env`，保留启动时加载的 `.env`）→ `curl /health`。

## 验证
- 本地：后端 54 测试通过、桌面 60 测试通过、桌面 `tsc --noEmit` 通过、`python scripts/verify.py` 通过。
- 云端：构建通过、`dist` 含新 prompt 与 `normalizeReply`、`pm2` 重启后 `/health` 返回 `{"status":"ok"}`、进程稳定无新错误日志。
- OSS：`latest.json` 依次更新为 0.1.4、0.1.5，安装包 HTTP 200 可下载。

## 安全备注
- 排障时云端 PM2 env 输出过 `LLM_API_KEY`、`ALI_OSS_ACCESS_KEY_SECRET` 等明文密钥，未入仓库/公网，但已建议用户轮换。
- 误用 `git add -A` 曾把参考素材（`AI客服prompt/`、`Image 1.png`、`前端ui原型图/`）提交，已用清理提交移出并写入 `.gitignore`（本地文件保留）。
