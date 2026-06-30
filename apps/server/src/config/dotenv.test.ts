import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "./dotenv.js";

describe("loadLocalEnv", () => {
  it("loads local .env values from the current working directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "zaixiankefu-env-"));
    try {
      writeFileSync(
        join(dir, ".env"),
        [
          "# local development",
          "SUPABASE_URL=https://example.supabase.co",
          "MONGODB_URI=\"mongodb://user:pass@example.invalid/db\"",
          "LLM_API_KEY='test-key'"
        ].join("\n"),
        "utf8"
      );
      const env: Record<string, string | undefined> = {};

      loadLocalEnv({ cwd: dir, env });

      expect(env.SUPABASE_URL).toBe("https://example.supabase.co");
      expect(env.MONGODB_URI).toBe("mongodb://user:pass@example.invalid/db");
      expect(env.LLM_API_KEY).toBe("test-key");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("overrides ambient shell values with project .env values by default", () => {
    const dir = mkdtempSync(join(tmpdir(), "zaixiankefu-env-"));
    try {
      writeFileSync(join(dir, ".env"), "MONGODB_DB=zaixiankefu\n", "utf8");
      const env: Record<string, string | undefined> = { MONGODB_DB: "chengshang_tools" };

      loadLocalEnv({ cwd: dir, env });

      expect(env.MONGODB_DB).toBe("zaixiankefu");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("can preserve existing process environment values when requested", () => {
    const dir = mkdtempSync(join(tmpdir(), "zaixiankefu-env-"));
    try {
      writeFileSync(join(dir, ".env"), "PORT=9999\n", "utf8");
      const env: Record<string, string | undefined> = { PORT: "8787" };

      loadLocalEnv({ cwd: dir, env, override: false });

      expect(env.PORT).toBe("8787");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
