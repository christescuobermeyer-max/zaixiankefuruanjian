import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { validateBuildEnv } from "./validate-build-env.mjs";

const validEnv = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_ANON_KEY: "anon-key",
  VITE_BACKEND_URL: "https://api.example.com"
};

describe("validateBuildEnv", () => {
  it("accepts an HTTPS production backend URL", () => {
    expect(validateBuildEnv(validEnv)).toEqual({ ok: true, errors: [] });
  });

  it("rejects localhost backend URLs for production desktop builds", () => {
    const result = validateBuildEnv({
      ...validEnv,
      VITE_BACKEND_URL: "http://127.0.0.1:8787"
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("VITE_BACKEND_URL must use https for desktop production builds");
    expect(result.errors).toContain("VITE_BACKEND_URL must not point to localhost or 127.0.0.1 for desktop production builds");
  });

  it("exits with an error when the CLI sees a localhost backend URL", () => {
    const scriptPath = resolve("scripts/validate-build-env.mjs");
    const result = spawnSync(process.execPath, [scriptPath], {
      encoding: "utf8",
      env: {
        ...process.env,
        VITE_SUPABASE_URL: validEnv.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: validEnv.VITE_SUPABASE_ANON_KEY,
        VITE_BACKEND_URL: "http://127.0.0.1:8787"
      }
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("VITE_BACKEND_URL must not point to localhost");
  });
});
