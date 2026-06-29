// 自动更新发布的纯逻辑：组装 OSS key 与 latest.json。
// 不做真实 OSS 写入，便于单元测试（见 release-lib.test.mjs）。

export const OSS_PREFIX = "zaixiankefu/";

// 拼接 OSS object key，强制带上 zaixiankefu/ 前缀，避免与其他项目更新文件混淆。
export function ossKey(name, prefix = OSS_PREFIX) {
  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  const normalizedName = name.replace(/^\/+/, "");
  return `${normalizedPrefix}${normalizedName}`;
}

// 构造 Tauri updater 的 latest.json。
// platforms 形如 { "windows-x86_64": { signature, url } }。
export function buildLatestJson({ version, notes, pubDate, platforms }) {
  if (!version) {
    throw new Error("version is required");
  }
  if (!platforms || Object.keys(platforms).length === 0) {
    throw new Error("at least one platform is required");
  }

  for (const [target, info] of Object.entries(platforms)) {
    if (!info.signature) {
      throw new Error(`platform ${target} missing signature`);
    }
    if (!info.url) {
      throw new Error(`platform ${target} missing url`);
    }
  }

  return {
    version,
    notes: notes ?? "",
    pub_date: pubDate ?? new Date().toISOString(),
    platforms
  };
}

// 由 OSS 配置和 object key 生成公网下载 URL。
export function publicUrl({ bucket, region }, key) {
  if (!bucket || !region) {
    throw new Error("bucket and region are required");
  }
  return `https://${bucket}.${region}.aliyuncs.com/${key}`;
}
