import { describe, expect, it } from "vitest";
import { buildLatestJson, ossKey, publicUrl, OSS_PREFIX } from "./release-lib.mjs";

describe("ossKey", () => {
  it("prepends the zaixiankefu/ prefix", () => {
    expect(ossKey("latest.json")).toBe("zaixiankefu/latest.json");
    expect(OSS_PREFIX).toBe("zaixiankefu/");
  });

  it("does not double up the prefix or slashes", () => {
    expect(ossKey("/latest.json")).toBe("zaixiankefu/latest.json");
    expect(ossKey("app.exe", "zaixiankefu")).toBe("zaixiankefu/app.exe");
  });
});

describe("buildLatestJson", () => {
  const platforms = {
    "windows-x86_64": { signature: "sig", url: "https://x/app.exe" }
  };

  it("builds a valid latest.json structure", () => {
    const json = buildLatestJson({ version: "1.2.0", notes: "fix", pubDate: "2026-01-01T00:00:00Z", platforms });
    expect(json).toEqual({
      version: "1.2.0",
      notes: "fix",
      pub_date: "2026-01-01T00:00:00Z",
      platforms
    });
  });

  it("defaults notes and pub_date", () => {
    const json = buildLatestJson({ version: "1.0.0", platforms });
    expect(json.notes).toBe("");
    expect(typeof json.pub_date).toBe("string");
  });

  it("requires a version", () => {
    expect(() => buildLatestJson({ platforms })).toThrow(/version/);
  });

  it("requires at least one platform", () => {
    expect(() => buildLatestJson({ version: "1.0.0", platforms: {} })).toThrow(/platform/);
  });

  it("requires signature and url per platform", () => {
    expect(() => buildLatestJson({ version: "1.0.0", platforms: { win: { url: "u" } } })).toThrow(/signature/);
    expect(() => buildLatestJson({ version: "1.0.0", platforms: { win: { signature: "s" } } })).toThrow(/url/);
  });
});

describe("publicUrl", () => {
  it("builds an OSS public url from config and key", () => {
    expect(publicUrl({ bucket: "zaixiankefu", region: "oss-cn-hangzhou" }, "zaixiankefu/latest.json")).toBe(
      "https://zaixiankefu.oss-cn-hangzhou.aliyuncs.com/zaixiankefu/latest.json"
    );
  });

  it("requires bucket and region", () => {
    expect(() => publicUrl({ bucket: "b" }, "k")).toThrow(/region/);
  });
});
