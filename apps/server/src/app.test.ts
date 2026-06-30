import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { createApp } from "./app.js";

const jwtSecret = "test-secret-with-enough-length";

async function token() {
  return new SignJWT({ sub: "user-1" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(jwtSecret));
}

describe("createApp", () => {
  it("allows desktop development origin to call API routes with authorization headers", async () => {
    const app = createApp({ jwtSecret });

    const res = await app.request("/api/conversations", {
      method: "OPTIONS",
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type"
      }
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://127.0.0.1:5173");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("does not allow arbitrary browser origins", async () => {
    const app = createApp({ jwtSecret });

    const res = await app.request("/api/conversations", {
      method: "OPTIONS",
      headers: {
        Origin: "https://evil.example",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type"
      }
    });

    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("protects API routes with auth middleware", async () => {
    const app = createApp({ jwtSecret });

    const res = await app.request("/api/conversations");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("protects chat route with auth middleware", async () => {
    const app = createApp({ jwtSecret });

    const res = await app.request("/api/chat", { method: "POST" });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("mounts chat route after authentication", async () => {
    const app = createApp({ jwtSecret });

    const res = await app.request("/api/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await token()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ conversationId: "", message: "" })
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "conversationId and message are required" });
  });
});
