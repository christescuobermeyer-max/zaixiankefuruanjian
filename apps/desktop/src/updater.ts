import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus =
  | { state: "checking" }
  | { state: "up-to-date" }
  | { state: "available"; version: string; notes?: string }
  | { state: "downloading"; downloaded: number; total?: number }
  | { state: "installing" }
  | { state: "error"; message: string };

// 仅在 Tauri 桌面环境可用；浏览器预览下 __TAURI_INTERNALS__ 不存在。
export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// 检查更新并（若有）下载安装，最后重启应用。通过 onStatus 回调上报进度。
export async function checkAndInstallUpdate(
  onStatus: (status: UpdateStatus) => void
): Promise<void> {
  if (!isTauriRuntime()) {
    onStatus({ state: "up-to-date" });
    return;
  }

  try {
    onStatus({ state: "checking" });
    const update = await check();

    if (!update) {
      onStatus({ state: "up-to-date" });
      return;
    }

    onStatus({ state: "available", version: update.version, notes: update.body });

    let downloaded = 0;
    let total: number | undefined;
    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength;
        onStatus({ state: "downloading", downloaded: 0, total });
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
        onStatus({ state: "downloading", downloaded, total });
      } else if (event.event === "Finished") {
        onStatus({ state: "installing" });
      }
    });

    await relaunch();
  } catch (error) {
    onStatus({ state: "error", message: error instanceof Error ? error.message : String(error) });
  }
}
