import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type EnvTarget = Record<string, string | undefined>;

export type LoadLocalEnvOptions = {
  cwd?: string;
  env?: EnvTarget;
  filename?: string;
  override?: boolean;
};

export function loadLocalEnv(options: LoadLocalEnvOptions = {}): void {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const filename = options.filename ?? ".env";
  const override = options.override ?? true;
  const path = join(cwd, filename);

  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed || (!override && env[parsed.key] !== undefined)) {
      continue;
    }
    env[parsed.key] = parsed.value;
  }
}

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const withoutExport = trimmed.startsWith("export ") ? trimmed.slice(7).trimStart() : trimmed;
  const equalsIndex = withoutExport.indexOf("=");
  if (equalsIndex <= 0) {
    return null;
  }

  const key = withoutExport.slice(0, equalsIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  return {
    key,
    value: parseEnvValue(withoutExport.slice(equalsIndex + 1).trim())
  };
}

function parseEnvValue(value: string): string {
  if (value.length < 2) {
    return stripInlineComment(value);
  }

  const quote = value[0];
  if ((quote === "\"" || quote === "'") && value.endsWith(quote)) {
    const inner = value.slice(1, -1);
    return quote === "\"" ? unescapeDoubleQuoted(inner) : inner;
  }

  return stripInlineComment(value);
}

function stripInlineComment(value: string): string {
  return value.replace(/\s+#.*$/, "").trim();
}

function unescapeDoubleQuoted(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, "\"")
    .replace(/\\\\/g, "\\");
}
