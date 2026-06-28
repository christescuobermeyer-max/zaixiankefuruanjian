#!/usr/bin/env python3
"""Project-level constraint verifier (TEMPLATE — copy into the target project).

Harness Engineering says every hard constraint must have a runnable feedback
mechanism. This turns the `约束反馈映射` table into an executable artifact: it
reads `docs/constraints.json` and runs each constraint's check command, so
"is this constraint actually enforced?" becomes a command, not a promise.

Copy this file to the target project as `scripts/verify.py`, create
`docs/constraints.json` (see constraints.example.json), and run:

    python scripts/verify.py

docs/constraints.json schema (list of objects):
    {
      "id":         "no-secrets",
      "constraint": "文档/代码/日志不得出现真实密钥",
      "check":      "rg -n \"AKIA[0-9A-Z]{16}\" . ; test $? -ne 0",
      "evidence":   "命令无命中即通过"
    }
A constraint PASSES when its `check` shell command exits 0.
Exit code 0 = all constraints pass, 1 = at least one fails or is unenforced.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

CONSTRAINTS = Path("docs/constraints.json")


def main() -> int:
    if not CONSTRAINTS.exists():
        print(f"FAIL: {CONSTRAINTS} not found — define your constraint→check map first")
        return 1
    items = json.loads(CONSTRAINTS.read_text(encoding="utf-8"))
    passed = failed = 0
    for it in items:
        cid = it.get("id", "?")
        check = it.get("check")
        if not check:
            print(f"  UNENFORCED  {cid}: {it.get('constraint', '')} (no `check` command)")
            failed += 1
            continue
        proc = subprocess.run(check, shell=True, capture_output=True, text=True)
        if proc.returncode == 0:
            print(f"  PASS  {cid}")
            passed += 1
        else:
            print(f"  FAIL  {cid}: {it.get('constraint', '')}")
            tail = (proc.stderr or proc.stdout or "").strip().splitlines()[-3:]
            for line in tail:
                print(f"        {line}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed/unenforced")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
