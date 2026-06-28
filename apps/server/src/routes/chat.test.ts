import { SignJWT } from "jose";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { authMiddleware } from "../middleware/auth.js";
import { createChatRoute } from "./chat.js";

const secret = "test-secret-with-enough-length";

async function token(sub = "user-1") {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
}

function buildApp() {
  const app = new Hono();
  app.use("/api/*", authMiddleware({ jwtSecret: secret }));
  app.route(
    "/api",
    createChatRoute({
      streamChat: async () =>
        new Response("data: hello\n\ndata: [DONE]\n\n", {
          headers: { "Content-Type": "text/event-stream" }
        })
    })
  );
  return app;
}

describe("chat route", () => {
  it("streams chat responses for authenticated users", async () => {
    const app = buildApp();

    const res = await app.request("/api/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await token()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ conversationId: "conv-1", message: "催单" })
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    expect(await res.text()).toContain("data: hello");
  });

  it("rejects invalid chat payloads", async () => {
    const app = buildApp();

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
