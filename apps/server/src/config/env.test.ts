import { describe, expect, it } from "vitest";
import { loadServerEnv } from "./env.js";

describe("loadServerEnv", () => {
  it("loads required server configuration", () => {
    const env = loadServerEnv({
      PORT: "8787",
      SUPABASE_URL: "https://example.supabase.co",
      MONGODB_URI: "mongodb://mongo.local/db",
      MONGODB_DB: "zaixiankefu",
      LLM_BASE_URL: "https://yunwu.ai/v1",
      LLM_API_KEY: "llm-key",
      LLM_MODEL: "gemini-3.1-flash-lite",
      CONTEXT_TOKEN_LIMIT: "8000",
      KEEP_RECENT_ROUNDS: "6"
    });

    expect(env.port).toBe(8787);
    expect(env.supabaseUrl).toBe("https://example.supabase.co");
    expect(env.supabaseJwtSecret).toBeUndefined();
    expect(env.mongodbDb).toBe("zaixiankefu");
    expect(env.contextTokenLimit).toBe(8000);
  });

  it("fails closed when required secrets are missing", () => {
    expect(() => loadServerEnv({})).toThrow("Missing required environment variables");
  });

  it("rejects placeholder values from example files", () => {
    expect(() =>
      loadServerEnv({
        SUPABASE_URL: "https://fhtmewbnivxqiyfujgeb.supabase.co",
        SUPABASE_JWT_SECRET: "${SUPABASE_JWT_SECRET}",
        MONGODB_URI: "mongodb://user:pass@example.invalid/db",
        MONGODB_DB: "zaixiankefu",
        LLM_BASE_URL: "https://yunwu.ai/v1",
        LLM_API_KEY: "llm-key",
        LLM_MODEL: "gemini-3.1-flash-lite"
      })
    ).toThrow("Placeholder environment variables");
  });
});
