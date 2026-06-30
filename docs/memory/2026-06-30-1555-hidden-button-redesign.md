# 2026-06-30 15:55 隐藏按钮 UI 还原（原型解包）与 0.1.6 发布

## 背景
- 用户提供 `AI客服按钮原型 (离线版).html`，要求还原其中新版隐藏按钮设计并替换现有 `.hidden-pill`。

## 原型解包方法（可复用）
- 该 HTML 是「bundler」自包含页：真正内容在 `<script type="__bundler/manifest">`（uuid→{data(base64), compressed(gzip), mime}）与 `<script type="__bundler/template">`（整页 HTML 的 JSON 字符串，含 uuid 占位）。
- 顶部 `<svg id="__bundler_thumbnail">` 只是低保真预览，但能快速看出设计意图。
- 解包：node 读文件 → `indexOf` 截取两个 script 标签内容 → `JSON.parse(template)` 得到 HTML；manifest 各项 base64 解码、`compressed` 用 `zlib.gunzipSync`。
- 本例 manifest 只有 React/运行时 JS + woff2 字体；按钮组件 `<dc-import name="AI客服按钮">`（variants: default/hover/pressed，hint-size 680×216）的设计数据**内联在 template 的超长行**里，用 `grep -o` 提取 `linear-gradient(...)`/`#hex`/`border-radius:N`/文字 即可拿到精确配色。

## 还原的设计（写入 App.css `.hidden-pill`）
- 胶囊：`linear-gradient(158deg,#ecf8e5,#f4fcf1 54%,#e2f3da)` + `1px solid #bfe6b4` + 外发光 `rgba(122,202,124,.4)` + 顶部高光 `inset 0 1px 0 rgba(255,255,255,.55)`，`border-radius:999px`。
- 左侧头像 `.hidden-pill-avatar`：26px 圆，`linear-gradient(160deg,#8ad68c,#6bc96f 55%,#5fc15f)`，内含白色双眼 + 微笑 SVG。
- 文字 `.hidden-pill-label`：`#2e9c4d`、`font-weight:800`、白色高光。
- 右侧 `.hidden-pill-go`：22px 圆，`linear-gradient(180deg,#dbf1d4,#c9ecc0)` + `1px solid rgba(76,190,90,.45)`，绿色 `>` 箭头 `#3aa856`。
- 移除旧的 `.hidden-pill-status`（白点）与 `.hidden-pill-grip`（虚线把手）；整条仍可拖拽（`onPointerDown`），可访问名仍是「AI客服」，`App.test.tsx` 的 `getByRole(name:/AI客服/)` 不受影响。

## 取舍
- 保持隐藏窗口 180×42（不动 `lib.rs`/`tauri.conf.json`/锚定逻辑），在细条里还原视觉语言；比原型 680×216（更厚实）偏扁。若需更贴原型比例，需加高隐藏窗口并改对应测试。

## 验证与发布
- 桌面 `tsc --noEmit` 通过、60 测试通过（已更新 `tauriConfig.test.ts` 样式断言为新设计 token）。
- 纯前端改动，无后端部署。
- 版本 0.1.5 → 0.1.6；用 VS 2022 `vcvars64.bat` 构建签名包（见 [[2026-06-30-1529-ux-replies-quit-and-release]]）；发布到 OSS，线上 `latest.json` 已为 0.1.6，安装包 HTTP 200。
- git 提交 `0dec116` 已推送（显式 add 指定文件，避免重蹈 `git add -A` 误纳参考素材）。

## 临时产物（可复用/可删）
- 解包脚本 `%TEMP%\zkf-extract.mjs`、解出的 `%TEMP%\zkf-template.html`、按钮预览页 `%TEMP%\zkf-pill-preview.html`、构建脚本 `%TEMP%\zkf-build.bat`。
