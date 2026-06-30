import type { MiddlewareHandler } from "hono";

const ALLOWED_ORIGINS = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://tauri.localhost",
  "tauri://localhost",
  "https://tauri.localhost"
]);

const ALLOWED_METHODS = "GET,POST,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Authorization,Content-Type";

export function corsMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const origin = c.req.header("Origin");
    const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : null;

    if (c.req.method === "OPTIONS") {
      applyCorsHeaders(c.res.headers, allowedOrigin);
      return c.body(null, allowedOrigin ? 204 : 403);
    }

    await next();
    applyCorsHeaders(c.res.headers, allowedOrigin);
  };
}

function applyCorsHeaders(headers: Headers, allowedOrigin: string | null) {
  if (!allowedOrigin) {
    return;
  }

  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  headers.set("Vary", appendVaryOrigin(headers.get("Vary")));
  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
}

function appendVaryOrigin(value: string | null) {
  if (!value) {
    return "Origin";
  }
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .includes("origin")
    ? value
    : `${value}, Origin`;
}
