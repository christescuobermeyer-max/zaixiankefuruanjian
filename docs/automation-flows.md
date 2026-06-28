# 外部平台与自动化流程

## 范围
当前 MVP 不包含浏览器 RPA、平台页面自动化或批量真实操作。外部集成限定为：
- Supabase Auth。
- 云雾 OpenAI 兼容 LLM API。
- MongoDB 云数据库。
- 阿里云 OSS 自动更新分发。

## 平台流程：OSS 更新发布

### 目标
- 上传 Tauri updater 产物、签名文件和 `latest.json` 到 OSS `zaixiankefu/` 前缀。

### 类型
- API 型，通过 `ali-oss` SDK。

### 输入与前置条件
- 发布环境必须提供 OSS 凭据和 Tauri signing private key。
- `ALI_OSS_PREFIX` 固定为 `zaixiankefu/`。

### 只读探针
- 发布脚本实现前先测试 key 组装和 `latest.json` 结构。
- 不用真实 OSS 写入作为单元测试默认路径。

### 写操作门禁
- 上传真实 bucket 前需要用户确认 bucket、prefix、版本号和产物路径。
- 更新失败时保持旧版本 `latest.json` 可用。

### 失败处理
- OSS 权限失败：停止发布并检查 secret 权限。
- 签名失败：不得上传 `latest.json` 指向未签名包。
- 前缀错误：测试必须阻止不含 `zaixiankefu/` 的 key。
