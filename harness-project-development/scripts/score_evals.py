#!/usr/bin/env python3
"""Grade agent responses against the per-eval rubrics in evals/evals.json.

This makes the skill *measurable*. Each eval carries a rubric:
  "rubric": { "must_include": [...substrings...], "must_avoid": [...substrings...] }

Usage:
  python scripts/score_evals.py                      # lint: every eval has a valid rubric
  python scripts/score_evals.py --responses out.json # grade responses {"1": "text", ...}

Grading is a coarse substring gate (case-insensitive): an eval passes when every
`must_include` term is present and no `must_avoid` term is. It is intentionally
simple and deterministic; upgrade to an LLM judge by replacing `grade_one`.
Exit code 0 = pass, 1 = failure.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

EVALS = Path(__file__).resolve().parent.parent / "evals" / "evals.json"


def load_evals() -> list[dict]:
    data = json.loads(EVALS.read_text(encoding="utf-8"))
    return data.get("evals", [])


def lint(evals: list[dict]) -> int:
    bad = 0
    for ev in evals:
        rb = ev.get("rubric")
        inc = (rb or {}).get("must_include")
        avoid = (rb or {}).get("must_avoid")
        if not isinstance(inc, list) or not inc or not isinstance(avoid, list):
            print(f"  - eval {ev.get('id')}: missing or malformed rubric")
            bad += 1
    if bad:
        print(f"FAIL: {bad} eval(s) without a valid rubric")
        return 1
    print(f"OK: all {len(evals)} evals carry a valid rubric")
    return 0


def grade_one(rubric: dict, response: str) -> tuple[bool, list[str]]:
    text = response.lower()
    reasons: list[str] = []
    for term in rubric.get("must_include", []):
        if term.lower() not in text:
            reasons.append(f"missing: {term}")
    for term in rubric.get("must_avoid", []):
        if term.lower() in text:
            reasons.append(f"present but forbidden: {term}")
    return (not reasons), reasons


def grade(evals: list[dict], responses: dict) -> int:
    passed = failed = skipped = 0
    for ev in evals:
        eid = str(ev.get("id"))
        if eid not in responses:
            skipped += 1
            continue
        ok, reasons = grade_one(ev.get("rubric", {}), responses[eid])
        if ok:
            passed += 1
            print(f"  PASS  eval {eid}")
        else:
            failed += 1
            print(f"  FAIL  eval {eid}: {'; '.join(reasons)}")
    print(f"\n{passed} passed, {failed} failed, {skipped} not provided")
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--responses", help="JSON file mapping eval id -> response text")
    args = ap.parse_args()
    evals = load_evals()
    if not args.responses:
        return lint(evals)
    responses = json.loads(Path(args.responses).read_text(encoding="utf-8"))
    responses = {str(k): v for k, v in responses.items()}
    return grade(evals, responses)


if __name__ == "__main__":
    sys.exit(main())
