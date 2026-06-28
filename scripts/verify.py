#!/usr/bin/env python3
"""Run project harness constraints from docs/constraints.json."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

CONSTRAINTS = Path("docs/constraints.json")


def main() -> int:
    if not CONSTRAINTS.exists():
        print(f"FAIL: {CONSTRAINTS} not found")
        return 1

    items = json.loads(CONSTRAINTS.read_text(encoding="utf-8"))
    passed = 0
    failed = 0

    for item in items:
        cid = item.get("id", "?")
        check = item.get("check")
        if not check:
            print(f"UNENFORCED {cid}: {item.get('constraint', '')}")
            failed += 1
            continue

        proc = subprocess.run(check, shell=True, capture_output=True, text=True)
        if proc.returncode == 0:
            print(f"PASS {cid}")
            passed += 1
            continue

        print(f"FAIL {cid}: {item.get('constraint', '')}")
        output = (proc.stderr or proc.stdout or "").strip()
        for line in output.splitlines()[-5:]:
            print(f"  {line}")
        failed += 1

    print(f"\n{passed} passed, {failed} failed/unenforced")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
