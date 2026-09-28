#!/usr/bin/env python3
"""
check_clone_list — report drift between the registry and the private repo's clone list.

The clone list (clone-list.tsv in the private config repo) is hand-maintained: discovery by
GitHub topics was considered and rejected, and the list cannot live in the public umbrella.
That trades a generator for a document, so this script restores the one guarantee the retired
gen_manifest.py gave for free — the list and the registry agreeing — as a report.

It is NOT a CI gate: CI never sees the private repo. Run it from /labos-replicate and the
/labos-maintenance sweep.

INHERITED INVARIANT (from gen_manifest.py): the umbrella catalogues itself, but must never be
cloned into one of its own buckets. Any entry whose repo_url matches this repo's own remote is
skipped, in every URL spelling.

Format — one tab-separated row per repo, '#' comments and blank lines ignored:
    <clone url>\t<bucket dir>\t<slug>

Usage: check_clone_list.py [--list <path>]   (default: $LABOS_CONFIG_DIR/clone-list.tsv,
                                              or ~/.labos-config/clone-list.tsv)
Exit: 0 clean · 1 drift found · 2 list unreadable / registry invalid
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import registry as R  # noqa: E402


def norm_repo(url):
    """Comparable form of a repo URL: no scheme, no .git, no trailing slash, lowercased."""
    u = (url or "").strip().lower()
    for prefix in ("https://", "http://", "ssh://", "git@"):
        if u.startswith(prefix):
            u = u[len(prefix):]
    return u.replace(":", "/").rstrip("/").removesuffix(".git")


def own_remote(root=None):
    """This repo's own origin URL, or '' when git is unavailable."""
    try:
        out = subprocess.run(["git", "-C", root or R.ROOT, "config", "--get", "remote.origin.url"],
                             capture_output=True, text=True, check=True)
        return out.stdout.strip()
    except Exception:
        return ""


def default_list_path():
    base = os.environ.get("LABOS_CONFIG_DIR") or os.path.join(os.path.expanduser("~"), ".labos-config")
    return os.path.join(base, "clone-list.tsv")


def read_list(path):
    """Parse the TSV. Returns (rows, errors); each row is (url, bucket_dir, slug, lineno)."""
    rows, errors = [], []
    with open(path, encoding="utf-8-sig") as f:
        for n, line in enumerate(f, 1):
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            parts = [p.strip() for p in line.rstrip("\n").split("\t") if p.strip()]
            if len(parts) != 3:
                errors.append(f"{path}:{n}: expected 3 tab-separated fields, got {len(parts)}")
                continue
            url, bucket_dir, slug = parts
            if bucket_dir not in set(R.BUCKET_DIR.values()):
                errors.append(f"{path}:{n}: bucket dir '{bucket_dir}' not in "
                              f"{sorted(set(R.BUCKET_DIR.values()))}")
                continue
            rows.append((url, bucket_dir, slug, n))
    return rows, errors


def main():
    argv = sys.argv[1:]
    path = default_list_path()
    if "--list" in argv:
        i = argv.index("--list")
        if i + 1 >= len(argv):
            print("check_clone_list: --list needs a path", file=sys.stderr)
            return 2
        path = argv[i + 1]

    if not os.path.isfile(path):
        print(f"check_clone_list: no clone list at {path} — is the config repo cloned? "
              f"(scripts/labos-config.sh clone)", file=sys.stderr)
        return 2

    entries, load_errors = R.load()
    reg_errors = load_errors + R.validate(entries)
    rows, list_errors = read_list(path)
    if reg_errors or list_errors:
        for e in reg_errors + list_errors:
            print(f"  ✗ {e}", file=sys.stderr)
        return 2

    self_url = norm_repo(own_remote())
    by_url = {norm_repo(u): (u, b, s, n) for u, b, s, n in rows}

    missing, mismatched, extra, skipped = [], [], [], []
    wanted = set()
    for m in entries:
        url = (m.get("repo_url") or "").strip()
        slug = m.get("slug") or m.get("name") or "?"
        bucket_dir = R.BUCKET_DIR.get(m.get("bucket", ""), "")
        if self_url and url and norm_repo(url) == self_url:
            skipped.append((slug, "this repo — the umbrella is never cloned into a bucket"))
            continue
        if not url:
            skipped.append((slug, "no repo_url"))
            continue
        if not bucket_dir:
            skipped.append((slug, f"bad bucket '{m.get('bucket','')}'"))
            continue
        key = norm_repo(url)
        wanted.add(key)
        row = by_url.get(key)
        if row is None:
            missing.append((slug, url, bucket_dir))
        elif row[1] != bucket_dir or row[2] != slug:
            mismatched.append((slug, f"list says {row[1]}/{row[2]}, registry says {bucket_dir}/{slug}"))

    for u, b, s, n in rows:
        if norm_repo(u) not in wanted:
            extra.append((s, f"{path}:{n} — no registry entry with this repo_url"))

    for slug, url, bucket_dir in missing:
        print(f"  MISSING   {slug} — add a row: {url}\\t{bucket_dir}\\t{slug}")
    for slug, why in mismatched:
        print(f"  MISMATCH  {slug} — {why}")
    for slug, why in extra:
        print(f"  EXTRA     {slug} — {why}")
    for slug, why in skipped:
        print(f"  SKIPPED   {slug} — {why}")

    n_drift = len(missing) + len(mismatched) + len(extra)
    if n_drift:
        print(f"check_clone_list: {n_drift} drift item(s) against {path}.", file=sys.stderr)
        return 1
    print(f"check_clone_list: clean — {len(rows)} row(s) match the registry ({len(skipped)} skipped).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
