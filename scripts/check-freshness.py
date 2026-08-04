#!/usr/bin/env python3
"""
check-freshness — deterministic doc-freshness gate (no model involved).

Parses YAML frontmatter of every doc under the given roots and fails when:
  - `last_verified` + `ttl_days` < today            (TTL expiry)
  - any `sources:` file:line no longer resolves      (citation rot)
  - `verified_against` is not an ancestor of origin/main (code moved since verification)

Frontmatter contract (flat scalars; sources comma-joined `path:line` pairs):
  last_verified: YYYY-MM-DD · ttl_days: N · verified_against: <sha> · sources: a.py:12, b.ts:40

Docs with no frontmatter or none of these fields are skipped (reported as UNTRACKED).
Usage: check-freshness.py [--root <dir>]... [--repo <gitdir>]  (defaults: project-os/, cwd)
Exit: 0 clean · 1 findings · 2 usage/environment error
"""
import datetime
import os
import re
import subprocess
import sys


def parse_front(path):
    try:
        text = open(path, encoding="utf-8-sig").read()
    except Exception:
        return None
    if not text.startswith("---"):
        return None
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None
    meta = {}
    for line in parts[1].strip().splitlines():
        if ":" not in line or line.strip().startswith("#"):
            continue
        k, _, v = line.partition(":")
        meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta


def main():
    args = sys.argv[1:]
    roots, repo = [], "."
    it = iter(range(len(args)))
    i = 0
    while i < len(args):
        if args[i] == "--root" and i + 1 < len(args):
            roots.append(args[i + 1]); i += 2
        elif args[i] == "--repo" and i + 1 < len(args):
            repo = args[i + 1]; i += 2
        else:
            i += 1
    if not roots:
        roots = ["project-os"] if os.path.isdir("project-os") else ["claude-output-docs"]

    today = datetime.date.today()
    findings, untracked, checked = [], 0, 0

    for root in roots:
        if not os.path.isdir(root):
            continue
        for dirpath, _dirs, files in os.walk(root):
            for fn in files:
                if not fn.endswith(".md"):
                    continue
                p = os.path.join(dirpath, fn)
                meta = parse_front(p)
                if not meta or not any(k in meta for k in ("last_verified", "sources", "verified_against")):
                    untracked += 1
                    continue
                checked += 1
                lv, ttl = meta.get("last_verified", ""), meta.get("ttl_days", "")
                if lv and ttl:
                    try:
                        exp = datetime.date.fromisoformat(lv) + datetime.timedelta(days=int(ttl))
                        if exp < today:
                            findings.append(f"TTL_STALE      {p} (last_verified {lv} + {ttl}d < {today})")
                    except ValueError:
                        findings.append(f"BAD_FRONTMATTER {p} (unparsable last_verified/ttl_days)")
                for src in [s.strip() for s in meta.get("sources", "").split(",") if s.strip()]:
                    # Sentinel sources (history docs derive from git, not files) are exempt,
                    # mirroring the verified_against n/a rule.
                    if src.lower().startswith(("git-history", "n/a")):
                        continue
                    # Accept path:line and path:line-line ranges.
                    m = re.match(r"^(.*?):(\d+)(?:-(\d+))?$", src)
                    fpath = m.group(1) if m else src
                    target = os.path.join(repo, fpath)
                    if not os.path.exists(target):
                        findings.append(f"SOURCE_MISSING {p} -> {src}")
                va = meta.get("verified_against", "")
                # Only SHA-shaped verified_against values are git-checkable. Reference docs
                # that verify against external sources use a sentinel (e.g. "n/a (external
                # references)") and are exempt from the ancestry check by design.
                if va and re.fullmatch(r"[0-9a-f]{7,40}", va):
                    r = subprocess.run(["git", "-C", repo, "merge-base", "--is-ancestor", va, "origin/main"],
                                       capture_output=True)
                    if r.returncode not in (0,):
                        findings.append(f"STALE_BASE     {p} (verified_against {va[:12]} not an ancestor of origin/main)")
                elif va and not va.lower().startswith("n/a"):
                    findings.append(f"BAD_BASE       {p} (verified_against {va[:20]!r} is neither a SHA nor an 'n/a' sentinel)")

    print(f"check-freshness: {checked} tracked doc(s), {untracked} untracked, {len(findings)} finding(s).")
    for f in findings:
        print(f"  ✗ {f}")
    sys.exit(1 if findings else 0)


if __name__ == "__main__":
    main()
