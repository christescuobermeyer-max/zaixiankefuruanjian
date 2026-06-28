import { createRemoteJWKSet, customFetch, jwtVerify } from "jose";
import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../types/hono.js";

type AuthOptions = {
  jwtSecret?: string;
  supabaseUrl?: string;
  fetchJwks?: typeof fetch;
};

function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export function authMiddleware(options: AuthOptions = {}): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const token = extractBearerToken(c.req.header("Authorization"));
    const jwtSecret = options.jwtSecret ?? process.env.SUPABASE_JWT_SECRET;
    const supabaseUrl = options.supabaseUrl ?? process.env.SUPABASE_URL;

    if (!token || (!jwtSecret && !supabaseUrl)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const { payload } = jwtSecret
        ? await jwtVerify(token, new TextEncoder().encode(jwtSecret))
        : await verifyWithJwks(token, supabaseUrl!, options.fetchJwks);
      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      c.set("userId", payload.sub);
      await next();
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }
  };
}

async function verifyWithJwks(token: string, supabaseUrl: string, fetchJwks?: typeof fetch) {
  const normalizedUrl = supabaseUrl.replace(/\/$/, "");
  const jwks = createRemoteJWKSet(new URL(`${normalizedUrl}/auth/v1/.well-known/jwks.json`), {
    [customFetch]: fetchJwks
  });
  return jwtVerify(token, jwks, {
    issuer: `${normalizedUrl}/auth/v1`
  });
}
