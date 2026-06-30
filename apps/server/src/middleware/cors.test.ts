import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { corsMiddleware } from "./cors.js";

describe("corsMiddleware", () => {
  it("adds CORS headers to streamed API responses for the desktop dev origin", async () => {
    const app = new Hono();
    app.use("/api/*", corsMiddleware());
    app.post(
      "/api/chat",
      () =>
        new Response("data: hello\n\ndata: [DONE]\n\n", {
          headers: { "Content-Type": "text/event-stream" }
        })
    );

    const res = await app.request("/api/chat", {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ conversationId: "c1", message: "你好" })
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://127.0.0.1:5173");
    expect(res.headers.get("Vary")).toContain("Origin");
    expect(await res.text()).toContain("data: hello");
  });

  it("allows the packaged Tauri WebView origin", async () => {
    const app = new Hono();
    app.use("/api/*", corsMiddleware());
    app.get("/api/conversations", (c) => c.json([]));

    const res = await app.request("/api/conversations", {
      method: "OPTIONS",
      headers: {
        Origin: "http://tauri.localhost",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type"
      }
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://tauri.localhost");
  });
});
