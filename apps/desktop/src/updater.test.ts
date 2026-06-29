import { afterEach, describe, expect, it, vi } from "vitest";

const checkMock = vi.fn();
const relaunchMock = vi.fn();

vi.mock("@tauri-apps/plugin-updater", () => ({ check: () => checkMock() }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: () => relaunchMock() }));

import { checkAndInstallUpdate, isTauriRuntime, type UpdateStatus } from "./updater";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function withTauri() {
  vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
}

describe("isTauriRuntime", () => {
  it("is false without the Tauri internals", () => {
    vi.stubGlobal("window", {});
    expect(isTauriRuntime()).toBe(false);
  });

  it("is true with Tauri internals present", () => {
    withTauri();
    expect(isTauriRuntime()).toBe(true);
  });
});

describe("checkAndInstallUpdate", () => {
  it("reports up-to-date outside Tauri without calling check", async () => {
    vi.stubGlobal("window", {});
    const statuses: UpdateStatus[] = [];

    await checkAndInstallUpdate((s) => statuses.push(s));

    expect(statuses).toEqual([{ state: "up-to-date" }]);
    expect(checkMock).not.toHaveBeenCalled();
  });

  it("reports up-to-date when no update is available", async () => {
    withTauri();
    checkMock.mockResolvedValue(null);
    const statuses: UpdateStatus[] = [];

    await checkAndInstallUpdate((s) => statuses.push(s));

    expect(statuses.map((s) => s.state)).toEqual(["checking", "up-to-date"]);
  });

  it("downloads, installs and relaunches when an update is available", async () => {
    withTauri();
    const downloadAndInstall = vi.fn(async (cb: (e: { event: string; data?: { contentLength?: number; chunkLength?: number } }) => void) => {
      cb({ event: "Started", data: { contentLength: 100 } });
      cb({ event: "Progress", data: { chunkLength: 100 } });
      cb({ event: "Finished" });
    });
    checkMock.mockResolvedValue({ version: "1.2.0", body: "fix", downloadAndInstall });
    const statuses: UpdateStatus[] = [];

    await checkAndInstallUpdate((s) => statuses.push(s));

    expect(statuses.map((s) => s.state)).toEqual([
      "checking",
      "available",
      "downloading",
      "downloading",
      "installing"
    ]);
    expect(downloadAndInstall).toHaveBeenCalled();
    expect(relaunchMock).toHaveBeenCalled();
  });

  it("reports an error when check throws", async () => {
    withTauri();
    checkMock.mockRejectedValue(new Error("network down"));
    const statuses: UpdateStatus[] = [];

    await checkAndInstallUpdate((s) => statuses.push(s));

    expect(statuses.at(-1)).toEqual({ state: "error", message: "network down" });
  });
});
