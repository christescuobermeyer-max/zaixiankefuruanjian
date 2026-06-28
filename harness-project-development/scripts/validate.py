#!/usr/bin/env python3
"""Structure / eval / secret / self-consistency checks for the skill package.

Run from anywhere:  python scripts/validate.py
Exit code 0 = all checks pass, 1 = at least one failure.

Beyond structure, this enforces the skill's *own* promises (self-consistency):
no orphan skill routes, no superpowers- prefix, the harness-map template keeps
its mandated sections (incl. 技术栈), the core red lines keep the memory-doc and
timestamp-via-command rules, and every eval ships a graded rubric.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
errors: list[str] = []
checks = 0

# Built-in Claude Code agents/commands that are valid route targets but are not
# skills defined in the guidelines file.
ROUTE_WHITELIST = {"general-purpose", "init", "security-review", "code-review", "date"}


def check(cond: bool, msg: str) -> None:
    global checks
    checks += 1
    if not cond:
        errors.append(msg)


def read(rel: str) -> str:
    return (SKILL_ROOT / rel).read_text(encoding="utf-8")


def frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    fm: dict[str, str] = {}
    for line in text[3:end].splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip()
    return fm


def section(text: str, header: str) -> str:
    """Return the body of a `## header` section up to the next `## `."""
    start = text.find(header)
    if start == -1:
        return ""
    nxt = text.find("\n## ", start + len(header))
    return text[start: nxt if nxt != -1 else len(text)]


def check_skill_md() -> dict[str, str]:
    check((SKILL_ROOT / "SKILL.md").exists(), "SKILL.md is missing")
    if not (SKILL_ROOT / "SKILL.md").exists():
        return {}
    fm = frontmatter(read("SKILL.md"))
    check(bool(fm.get("name")), "SKILL.md frontmatter missing `name`")
    check(bool(fm.get("description")), "SKILL.md frontmatter missing `description`")
    return fm


def check_reference_links() -> None:
    text = read("SKILL.md")
    for rel in sorted(set(re.findall(r"references/[\w./-]+\.md", text))):
        check((SKILL_ROOT / rel).exists(), f"SKILL.md references missing file: {rel}")


def check_evals(skill_name: str) -> None:
    path = SKILL_ROOT / "evals" / "evals.json"
    check(path.exists(), "evals/evals.json is missing")
    if not path.exists():
        return
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        check(False, f"evals.json does not parse: {exc}")
        return
    check(data.get("skill_name") == skill_name,
          f"evals.json skill_name '{data.get('skill_name')}' != SKILL.md name '{skill_name}'")
    evals = data.get("evals", [])
    check(isinstance(evals, list) and len(evals) > 0, "evals.json has no eval cases")
    seen: set = set()
    for i, ev in enumerate(evals):
        for field in ("id", "prompt", "expected_output", "files"):
            check(field in ev, f"eval[{i}] missing field: {field}")
        check(ev.get("id") not in seen, f"eval id {ev.get('id')} is duplicated")
        seen.add(ev.get("id"))
        # Step 1: every eval must ship a graded rubric so the skill is measurable.
        rb = ev.get("rubric", {})
        check(isinstance(rb.get("must_include"), list) and rb["must_include"],
              f"eval {ev.get('id')} missing non-empty rubric.must_include")
        check(isinstance(rb.get("must_avoid"), list),
              f"eval {ev.get('id')} rubric.must_avoid must be a list")


def routing_tokens() -> list[str]:
    body = section(read("SKILL.md"), "## 子 Skill 路由")
    toks = set()
    for raw in re.findall(r"`([^`]+)`", body):
        t = raw.strip().lstrip("/")
        if re.fullmatch(r"[a-z][a-z0-9-]+", t):  # skill-name shape only
            toks.add(t)
    return sorted(toks)


def check_routing_orphans() -> None:
    guide = SKILL_ROOT / "superpowers-agents-guidelines.md"
    known = set(ROUTE_WHITELIST)
    if guide.exists():
        for raw in re.findall(r"`([^`]+)`", guide.read_text(encoding="utf-8")):
            known.add(raw.strip().lstrip("/"))
    for t in routing_tokens():
        check(t in known, f"routing skill `{t}` not found in guidelines or whitelist (orphan)")


def check_naming() -> None:
    body = section(read("SKILL.md"), "## 子 Skill 路由")
    bad = re.findall(r"`superpowers-[\w-]+`", body)
    check(not bad, f"SKILL.md routing uses superpowers- prefix (should be no-prefix): {bad}")


def check_harness_template() -> None:
    sections = ["## 项目使命", "## 技术栈", "## 硬约束", "## 权威命令", "## Skill 路由", "## 文档索引"]
    targets = list(SKILL_ROOT.glob("references/02-*.md")) + [SKILL_ROOT / "references/07-output-templates.md"]
    for path in targets:
        if not path.exists():
            check(False, f"harness-map template file missing: {path.name}")
            continue
        text = path.read_text(encoding="utf-8")
        for sec in sections:
            check(sec in text, f"{path.name} harness-map template missing section: {sec}")


def check_red_lines() -> None:
    text = read("SKILL.md")
    check("docs/memory/" in text, "SKILL.md red lines drop the memory-doc rule")
    check(("date" in text) or ("Get-Date" in text),
          "SKILL.md red lines drop the timestamp-via-command rule")
    check("技术栈" in text, "SKILL.md no longer mandates 技术栈 in the harness map")


SECRET_PATTERNS = [
    (re.compile(r"AKIA[0-9A-Z]{16}"), "AWS access key id"),
    (re.compile(r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}"), "JWT-like token"),
    (re.compile(r"mongodb(\+srv)?://[^\s:]+:[^\s@]+@"), "MongoDB URI with credentials"),
    (re.compile(r"sk-[A-Za-z0-9]{32,}"), "OpenAI-style secret key"),
    (re.compile(r"(?i)(secret|token|password|api[_-]?key)\s*[:=]\s*['\"][A-Za-z0-9/+]{24,}['\"]"),
     "hardcoded secret literal"),
]


def check_secrets() -> None:
    for path in SKILL_ROOT.rglob("*"):
        if path.is_dir() or path.suffix not in {".md", ".json", ".py"}:
            continue
        if path.resolve() == Path(__file__).resolve():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pat, label in SECRET_PATTERNS:
            if pat.search(text):
                check(False, f"possible {label} in {path.relative_to(SKILL_ROOT)}")


def main() -> int:
    fm = check_skill_md()
    check_reference_links()
    check_evals(fm.get("name", ""))
    check_routing_orphans()
    check_naming()
    check_harness_template()
    check_red_lines()
    check_secrets()

    if errors:
        print(f"FAIL: {len(errors)} problem(s) across {checks} checks\n")
        for e in errors:
            print(f"  - {e}")
        return 1
    print(f"OK: all {checks} checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
