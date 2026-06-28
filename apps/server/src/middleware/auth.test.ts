import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { authMiddleware } from "./auth.js";
import type { AppBindings } from "../types/hono.js";

const secret = "test-secret-with-enough-length";

async function signTestToken(sub: string) {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}

function buildProtectedApp() {
  const app = new Hono<AppBindings>();
  app.use("/protected", authMiddleware({ jwtSecret: secret }));
  app.get("/protected", (c) => c.json({ userId: c.get("userId") }));
  return app;
}

describe("authMiddleware", () => {
  it("accepts a valid Supabase JWT and exposes userId", async () => {
    const token = await signTestToken("user-123");
    const app = buildProtectedApp();

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "user-123" });
  });

  it("rejects requests without bearer token", async () => {
    const app = buildProtectedApp();

    const res = await app.request("/protected");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("rejects invalid tokens", async () => {
    const app = buildProtectedApp();

    const res = await app.request("/protected", {
      headers: { Authorization: "Bearer invalid-token" }
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("accepts a valid Supabase JWT via project JWKS", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    const fetchMock = async () =>
      new Response(JSON.stringify({ keys: [{ ...jwk, kid: "test-key", alg: "RS256", use: "sig" }] }), {
        headers: { "Content-Type": "application/json" }
      });
    const token = await new SignJWT({ sub: "jwks-user" })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer("https://example.supabase.co/auth/v1")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);
    const app = new Hono<AppBindings>();
    app.use(
      "/protected",
      authMiddleware({
        supabaseUrl: "https://example.supabase.co",
        fetchJwks: fetchMock
      })
    );
    app.get("/protected", (c) => c.json({ userId: c.get("userId") }));

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "jwks-user" });
  });
});
