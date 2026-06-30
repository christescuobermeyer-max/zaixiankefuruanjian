import { loadEnv } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_CLIENT_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_BACKEND_URL"];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function validateBuildEnv(env = process.env) {
  const errors = [];

  for (const key of REQUIRED_CLIENT_ENV) {
    if (!clean(env[key])) {
      errors.push(`${key} is required for desktop production builds`);
    }
  }

  const backendUrl = clean(env.VITE_BACKEND_URL);
  if (backendUrl) {
    const parsed = parseUrl(backendUrl, "VITE_BACKEND_URL", errors);
    if (parsed) {
      if (parsed.protocol !== "https:") {
        errors.push("VITE_BACKEND_URL must use https for desktop production builds");
      }
      if (LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
        errors.push("VITE_BACKEND_URL must not point to localhost or 127.0.0.1 for desktop production builds");
      }
    }
  }

  parseUrl(clean(env.VITE_SUPABASE_URL), "VITE_SUPABASE_URL", errors);

  return {
    ok: errors.length === 0,
    errors
  };
}

function clean(value) {
  return typeof value === "string" ? value.trim().replace(/^["']|["']$/g, "") : "";
}

function parseUrl(value, key, errors) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    errors.push(`${key} must be a valid URL`);
    return null;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const mode = process.env.NODE_ENV || "production";
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const result = validateBuildEnv(env);
  if (!result.ok) {
    console.error(result.errors.join("\n"));
    process.exit(1);
  }
}
