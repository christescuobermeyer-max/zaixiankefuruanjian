import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { findWindowsArtifact } from "./release.mjs";

describe("findWindowsArtifact", () => {
  it("selects the installer and signature for the requested version only", () => {
    const dir = mkdtempSync(join(tmpdir(), "zaixiankefu-release-"));
    writeFileSync(join(dir, "外卖在线客服助手_0.1.1_x64-setup.exe"), "old");
    writeFileSync(join(dir, "外卖在线客服助手_0.1.1_x64-setup.exe.sig"), "old-sig");
    writeFileSync(join(dir, "外卖在线客服助手_0.1.2_x64-setup.exe"), "new");
    writeFileSync(join(dir, "外卖在线客服助手_0.1.2_x64-setup.exe.sig"), "new-sig");

    const artifact = findWindowsArtifact("0.1.2", dir);

    expect(artifact?.installerPath).toContain("0.1.2");
    expect(artifact?.signature).toBe("new-sig");
  });
});
