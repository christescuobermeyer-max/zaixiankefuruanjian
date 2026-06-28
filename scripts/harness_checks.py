#!/usr/bin/env python3
"""Small cross-platform checks for the project harness."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SKIP_DIRS = {
    ".git",
    ".idea",
    ".vscode",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "target",
    ".pnpm-store",
    "初始",
}
SKIP_FILES = {"初始需求", ".env"}

SECRET_PATTERNS = [
    ("private_key", re.compile(r"-----BEGIN (?:OPENSSH|RSA|EC|DSA)? ?PRIVATE KEY-----")),
    ("aws_access_key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("mongodb_password_uri", re.compile(r"mongodb(?:\+srv)?://[^\s:/]+:[^\s@]+@[^\s]+")),
    ("generic_bearer", re.compile(r"Bearer\s+[A-Za-z0-9._~+/=-]{30,}")),
    ("openai_style_key", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b")),
]

REQUIRED_FILES = [
    "AGENTS.md",
    "README.md",
    "docs/project-context.md",
    "docs/requirements.md",
    "docs/architecture.md",
    "docs/security.md",
    "docs/automation-flows.md",
    "docs/verification.md",
    "docs/progress.md",
    "docs/constraints.json",
    "docs/项目开发文档.md",
    "docs/前端UI设计文档.md",
]

SERVER_ENV_KEYS = {
    "PORT",
    "SUPABASE_URL",
    "SUPABASE_JWT_SECRET",
    "MONGODB_URI",
    "MONGODB_DB",
    "LLM_BASE_URL",
    "LLM_API_KEY",
    "LLM_MODEL",
    "CONTEXT_TOKEN_LIMIT",
    "KEEP_RECENT_ROUNDS",
}

DESKTOP_ENV_KEYS = {
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_BACKEND_URL",
}


def iter_text_files() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*"):
        rel = path.relative_to(ROOT)
        if any(part in SKIP_DIRS for part in rel.parts):
            continue
        if path.name in SKIP_FILES:
            continue
        if path.name.startswith(".env."):
            continue
        if not path.is_file():
            continue
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".ico", ".exe", ".zip"}:
            continue
        files.append(path)
    return files


def is_placeholder_line(line: str) -> bool:
    placeholders = ("${", "<", "YOUR_", "PLACEHOLDER", "example", "占位符")
    return any(marker in line for marker in placeholders)


def no_secrets() -> int:
    findings: list[str] = []
    for path in iter_text_files():
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for number, line in enumerate(text.splitlines(), 1):
            if is_placeholder_line(line):
                continue
            for name, pattern in SECRET_PATTERNS:
                if pattern.search(line):
                    rel = path.relative_to(ROOT)
                    findings.append(f"{rel}:{number}: {name}")
    if findings:
        print("\n".join(findings))
        return 1
    return 0


def required_files() -> int:
    missing = [path for path in REQUIRED_FILES if not (ROOT / path).exists()]
    if missing:
        print("Missing required files:")
        print("\n".join(missing))
        return 1
    return 0


def parse_env_keys(path: Path) -> set[str]:
    keys: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        keys.add(stripped.split("=", 1)[0])
    return keys


def env_examples() -> int:
    server = ROOT / "apps/server/.env.example"
    desktop = ROOT / "apps/desktop/.env.example"
    gitignore = ROOT / ".gitignore"
    missing: list[str] = []

    if not server.exists():
        missing.append(str(server.relative_to(ROOT)))
    if not desktop.exists():
        missing.append(str(desktop.relative_to(ROOT)))
    if not gitignore.exists():
        missing.append(".gitignore")
    if missing:
        print("Missing files:")
        print("\n".join(missing))
        return 1

    server_missing = SERVER_ENV_KEYS - parse_env_keys(server)
    desktop_missing = DESKTOP_ENV_KEYS - parse_env_keys(desktop)
    ignore_text = gitignore.read_text(encoding="utf-8")
    ignore_missing = [entry for entry in [".env", ".env.*", "初始需求"] if entry not in ignore_text]

    errors: list[str] = []
    if server_missing:
        errors.append("Server env missing: " + ", ".join(sorted(server_missing)))
    if desktop_missing:
        errors.append("Desktop env missing: " + ", ".join(sorted(desktop_missing)))
    if ignore_missing:
        errors.append(".gitignore missing: " + ", ".join(ignore_missing))
    if errors:
        print("\n".join(errors))
        return 1
    return 0


def docs_links() -> int:
    agents = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
    links = re.findall(r"\[[^\]]+\]\(([^)]+)\)", agents)
    missing = []
    for link in links:
        if "://" in link or link.startswith("#"):
            continue
        path = (ROOT / link).resolve()
        try:
            path.relative_to(ROOT)
        except ValueError:
            missing.append(link)
            continue
        if not path.exists():
            missing.append(link)
    if missing:
        print("Broken AGENTS.md links:")
        print("\n".join(missing))
        return 1
    return 0


def planned_structure() -> int:
    required = [
        "apps/server/src",
        "apps/desktop/src",
        "apps/desktop/src-tauri",
        "docs/plans",
        "docs/memory",
        "scripts",
        "pnpm-workspace.yaml",
        "package.json",
    ]
    missing = [path for path in required if not (ROOT / path).exists()]
    if missing:
        print("Missing planned paths:")
        print("\n".join(missing))
        return 1
    workspace = (ROOT / "pnpm-workspace.yaml").read_text(encoding="utf-8")
    if "apps/*" not in workspace:
        print("pnpm-workspace.yaml must include apps/*")
        return 1
    return 0


CHECKS = {
    "no-secrets": no_secrets,
    "required-files": required_files,
    "env-examples": env_examples,
    "docs-links": docs_links,
    "planned-structure": planned_structure,
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("check", choices=sorted(CHECKS))
    args = parser.parse_args()
    return CHECKS[args.check]()


if __name__ == "__main__":
    sys.exit(main())
