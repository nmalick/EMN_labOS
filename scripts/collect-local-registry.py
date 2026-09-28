#!/usr/bin/env python3
"""
collect-local-registry — assemble the gitignored registry.local/ from cloned project repos.

Each PRIVATE project repo carries its own entry at project-os/registry-entry.md. This script
copies those into registry.local/<slug>.md, so private project metadata lives with the project
and never sits in the world-readable umbrella.

Public projects are NOT collected: their entries stay tracked in registry/, which is what CI
reads. An entry that is publication-eligible is therefore an error here, not a silent copy —
registry.py's validate() would reject it in registry.local/ anyway.

Carry-forward: when a project folder is not on disk (a fresh machine mid-bootstrap, an
un-cloned bucket, a worktree), an existing registry.local/<slug>.md is LEFT ALONE. Absence of
a clone is not evidence that an entry is stale. Use --prune to delete entries whose project IS
on disk but no longer carries an entry file.

Usage: collect-local-registry.py [--prune] [--check]
Exit: 0 clean · 1 findings (--check: would change) · 2 invalid entry
"""
import os
import shutil
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import registry as R  # noqa: E402

ENTRY_REL = os.path.join("project-os", "registry-entry.md")
OUT_DIR = R.REG_LOCAL


def tracked_slugs():
    """Slugs already owned by the tracked registry/ — never shadow one from a project repo."""
    slugs = set()
    for name in os.listdir(R.REG) if os.path.isdir(R.REG) else []:
        if not name.endswith(".md") or name.lower() in R.SKIP_FILES or name.endswith("-index.md"):
            continue
        meta, err = R.parse_frontmatter(os.path.join(R.REG, name))
        if meta and meta.get("slug"):
            slugs.add(meta["slug"])
    return slugs


def discover():
    """Every project folder on disk, as (bucket_dir, slug, abspath)."""
    for bucket_dir in sorted(set(R.BUCKET_DIR.values())):
        root = os.path.join(R.ROOT, bucket_dir)
        if not os.path.isdir(root):
            continue
        for slug in sorted(os.listdir(root)):
            path = os.path.join(root, slug)
            if os.path.isdir(path) and not slug.startswith("."):
                yield bucket_dir, slug, path


def main():
    prune = "--prune" in sys.argv[1:]
    check = "--check" in sys.argv[1:]

    owned = tracked_slugs()
    collected, skipped, carried, pruned, errors = [], [], [], [], []
    seen_on_disk = set()
    # Planned writes, applied ONLY after the whole scan validates. A run that reports
    # "refusing" must leave registry.local/ exactly as it found it — a half-applied refusal
    # is worse than either outcome.
    to_copy, to_remove = [], []

    for bucket_dir, slug, path in discover():
        seen_on_disk.add(slug)
        src = os.path.join(path, ENTRY_REL)
        dst = os.path.join(OUT_DIR, f"{slug}.md")
        if not os.path.isfile(src):
            if os.path.isfile(dst):
                if prune:
                    to_remove.append(dst)
                    pruned.append((slug, "on disk, no project-os/registry-entry.md"))
                else:
                    skipped.append((slug, "on disk with no entry file — stale registry.local copy "
                                          "kept (use --prune to delete)"))
            else:
                skipped.append((slug, "no project-os/registry-entry.md (public project, or not "
                                      "yet seeded)"))
            continue

        meta, err = R.parse_frontmatter(src)
        if err or meta is None:
            errors.append(f"{bucket_dir}/{slug}/{ENTRY_REL}: {err or 'unparsable'}")
            continue
        if meta.get("slug") and meta["slug"] != slug:
            errors.append(f"{bucket_dir}/{slug}/{ENTRY_REL}: slug '{meta['slug']}' does not match "
                          f"its folder name '{slug}'")
            continue
        if meta.get("slug") in owned:
            errors.append(f"{bucket_dir}/{slug}/{ENTRY_REL}: slug '{slug}' is already a tracked "
                          f"registry/ entry — a project repo must not shadow it")
            continue
        if R.is_public(meta):
            errors.append(f"{bucket_dir}/{slug}/{ENTRY_REL}: entry is publication-eligible "
                          f"(visibility={meta.get('visibility','')}) — public entries belong in the "
                          f"tracked registry/, which is what CI reads")
            continue

        existed = os.path.isfile(dst)
        same = existed and open(dst, "rb").read() == open(src, "rb").read()
        if not same:
            to_copy.append((src, dst))
            collected.append((slug, "updated" if existed else "new"))

    # Entries for projects that are not on disk: carried forward untouched.
    if os.path.isdir(OUT_DIR):
        for name in sorted(os.listdir(OUT_DIR)):
            if not name.endswith(".md"):
                continue
            slug = name[:-3]
            if slug not in seen_on_disk:
                carried.append((slug, "project folder not on disk — entry carried forward"))

    for slug, why in collected:
        print(f"  {'WOULD COLLECT' if check else 'COLLECTED'} {slug} — {why}")
    for slug, why in pruned:
        print(f"  {'WOULD PRUNE' if check else 'PRUNED'} {slug} — {why}")
    for slug, why in carried:
        print(f"  CARRIED {slug} — {why}")
    for slug, why in skipped:
        print(f"  SKIPPED {slug} — {why}")
    for e in errors:
        print(f"  ✗ {e}", file=sys.stderr)

    if errors:
        print("collect-local-registry: INVALID entry — refusing. registry.local/ unchanged.",
              file=sys.stderr)
        return 2
    if not check:
        if to_copy:
            os.makedirs(OUT_DIR, exist_ok=True)
        for src, dst in to_copy:
            shutil.copyfile(src, dst)
        for dst in to_remove:
            os.remove(dst)
    n = len(collected) + len(pruned)
    if check and n:
        print(f"collect-local-registry: {n} change(s) pending — run without --check.", file=sys.stderr)
        return 1
    print(f"collect-local-registry: {len(collected)} collected, {len(pruned)} pruned, "
          f"{len(carried)} carried forward.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
