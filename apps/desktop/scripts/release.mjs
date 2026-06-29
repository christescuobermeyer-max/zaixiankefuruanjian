// 自动更新发布脚本：把 Tauri updater 产物 + 签名 + latest.json 上传到阿里云 OSS。
//
// 用法：
//   1. 先构建带签名的更新包：
//      TAURI_SIGNING_PRIVATE_KEY=... TAURI_SIGNING_PRIVATE_KEY_PASSWORD=... pnpm --filter desktop tauri:build
//   2. 配好 OSS 环境变量后执行：
//      node apps/desktop/scripts/release.mjs --confirm
//
// 必需环境变量：
//   ALI_OSS_REGION, ALI_OSS_ACCESS_KEY_ID, ALI_OSS_ACCESS_KEY_SECRET, ALI_OSS_BUCKET
//   ALI_OSS_PREFIX（可选，默认 zaixiankefu/）
//
// 不带 --confirm 时为演练（dry-run）：只打印将要上传的内容，不写入 OSS。

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLatestJson, ossKey, publicUrl, OSS_PREFIX } from "./release-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(here, "..");

function readPkgVersion() {
  const conf = JSON.parse(readFileSync(join(desktopRoot, "src-tauri", "tauri.conf.json"), "utf-8"));
  return conf.version;
}

// 在 NSIS 输出目录里找 .exe 安装包及其 .sig 签名文件。
function findWindowsArtifact(version) {
  const bundleDir = join(desktopRoot, "src-tauri", "target", "release", "bundle", "nsis");
  if (!existsSync(bundleDir)) {
    return null;
  }
  const files = readdirSync(bundleDir);
  const installer = files.find((f) => f.endsWith("-setup.exe"));
  const sig = files.find((f) => f.endsWith("-setup.exe.sig"));
  if (!installer || !sig) {
    return null;
  }
  return {
    installerPath: join(bundleDir, installer),
    signature: readFileSync(join(bundleDir, sig), "utf-8").trim()
  };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return value;
}

async function main() {
  const confirmed = process.argv.includes("--confirm");
  const prefix = process.env.ALI_OSS_PREFIX ?? OSS_PREFIX;
  const version = readPkgVersion();

  const region = process.env.ALI_OSS_REGION;
  const bucket = process.env.ALI_OSS_BUCKET;

  const artifact = findWindowsArtifact(version);
  if (!artifact) {
    throw new Error(
      "未找到 Windows 更新产物（*-setup.exe + .sig）。请先用带签名私钥的环境运行 tauri:build。"
    );
  }

  const installerName = basename(artifact.installerPath);
  const installerKey = ossKey(installerName, prefix);
  const latestKey = ossKey("latest.json", prefix);

  const downloadUrl =
    region && bucket ? publicUrl({ bucket, region }, installerKey) : `oss://<bucket>/${installerKey}`;

  const latest = buildLatestJson({
    version,
    notes: process.env.RELEASE_NOTES ?? "",
    platforms: {
      "windows-x86_64": { signature: artifact.signature, url: downloadUrl }
    }
  });

  console.log("=== 发布计划 ===");
  console.log(`版本: ${version}`);
  console.log(`安装包: ${installerName}`);
  console.log(`OSS key (安装包): ${installerKey}`);
  console.log(`OSS key (latest.json): ${latestKey}`);
  console.log(`下载 URL: ${downloadUrl}`);
  console.log("latest.json:");
  console.log(JSON.stringify(latest, null, 2));

  if (!confirmed) {
    console.log("\n[dry-run] 未携带 --confirm，未执行真实上传。");
    return;
  }

  requireEnv("ALI_OSS_REGION");
  requireEnv("ALI_OSS_ACCESS_KEY_ID");
  requireEnv("ALI_OSS_ACCESS_KEY_SECRET");
  requireEnv("ALI_OSS_BUCKET");

  const { default: OSS } = await import("ali-oss");
  const client = new OSS({
    region,
    accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
    bucket
  });

  console.log("\n上传安装包...");
  await client.put(installerKey, artifact.installerPath);
  console.log("上传 latest.json...");
  await client.put(latestKey, Buffer.from(JSON.stringify(latest, null, 2)));
  console.log("发布完成。");
}

main().catch((error) => {
  console.error(`发布失败: ${error.message}`);
  process.exitCode = 1;
});
