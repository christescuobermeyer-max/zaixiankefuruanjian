type EnvLike = Record<string, string | undefined>;

export type ServerEnv = {
  port: number;
  supabaseUrl: string;
  supabaseJwtSecret?: string;
  mongodbUri: string;
  mongodbDb: string;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  contextTokenLimit: number;
  keepRecentRounds: number;
};

const REQUIRED = [
  "SUPABASE_URL",
  "MONGODB_URI",
  "MONGODB_DB",
  "LLM_BASE_URL",
  "LLM_API_KEY",
  "LLM_MODEL"
] as const;

export function loadServerEnv(env: EnvLike = process.env): ServerEnv {
  const missing = REQUIRED.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  const placeholders = REQUIRED.filter((key) => isPlaceholder(env[key]!));
  if (placeholders.length > 0) {
    throw new Error(`Placeholder environment variables: ${placeholders.join(", ")}`);
  }

  return {
    port: numberFromEnv(env.PORT, 8787),
    supabaseUrl: env.SUPABASE_URL!,
    supabaseJwtSecret: cleanOptional(env.SUPABASE_JWT_SECRET),
    mongodbUri: env.MONGODB_URI!,
    mongodbDb: env.MONGODB_DB!,
    llmBaseUrl: env.LLM_BASE_URL!,
    llmApiKey: env.LLM_API_KEY!,
    llmModel: env.LLM_MODEL!,
    contextTokenLimit: numberFromEnv(env.CONTEXT_TOKEN_LIMIT, 8000),
    keepRecentRounds: numberFromEnv(env.KEEP_RECENT_ROUNDS, 6)
  };
}

function cleanOptional(value: string | undefined): string | undefined {
  return value?.trim() ? value.trim() : undefined;
}

function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^\$\{[^}]+}$/.test(trimmed) ||
    /^<[^>]+>$/.test(trimmed) ||
    trimmed.includes("your-") ||
    trimmed.includes("example.invalid")
  );
}

function numberFromEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
