> **Invoke:** `/catalog-sync`
>
> **Purpose:** Regenerate the public project catalog from `registry/*.md`.

---
description: Regenerate every public surface (README catalog table, docs/, and the
  registry/<slug>-index.md pointers) from registry/*.md. Default-deny — shown only when
  public/anonymized AND (live_url OR repo_public OR showcase).
---

## What it does
`registry/<project>.md` frontmatter is the **single source of truth**. The catalog is **generated,
never hand-edited** — so a private project can't be named in hand-written prose.

**Default-deny filter:** a project reaches public surfaces only if
`visibility ∈ {public, anonymized}` AND (`live_url` non-empty OR `repo_public: true` OR
`showcase: true`) — `is_public()` in `scripts/lib/registry.py`. Everything else is omitted.
`showcase: true` alone publishes, so clearing `live_url` does **not** unpublish a project; and
because this repo is public, the registry file itself is world-readable — to fully delist,
delete the entry (not just `visibility: private`).

## Run
```bash
python3 scripts/catalog_sync.py
python3 scripts/catalog_sync.py --check
```
1. Edit `registry/<slug>.md`, then run the generator. Review the printed
   `SHOWN / OMITTED (why) / REMOVED` summary.
2. `--check` must be clean. It passes **iff a write run would change nothing**, and CI runs the
   same check on a clean checkout — so a clean local `--check` means a green CI gate.
3. Commit the registry change and the regenerated files **together**, with a **neutral message**
   (no project/client names in the log). Order does not matter: nothing generated depends on git
   history, so there is no "restamp after commit" step — never hand-edit the "as of" stamp.

Notes:
- **Kit pointers** (`registry/<slug>-index.md` body, corpus `doc_index`) are read from each
  project's gitignored `project-os/`. Run from the **main checkout** to refresh them; in a worktree
  or CI the project folders are absent and the committed content is carried forward (the summary
  tags those projects `[kit carried forward: …]`).
- **Removing a project**: delete `registry/<slug>.md` and run. The orphaned
  `registry/<slug>-index.md` is deleted automatically (`REMOVED` line); `--check` fails if one
  survives. Then grep the hand-written prose (`DIRECTORY.md`, trackers) — the generator can't.

## Adding / updating a project
Edit or add `registry/<slug>.md` frontmatter (`name, slug, bucket, visibility, status, showcase,
live_url, repo_url, repo_public, stack, summary` — contract in `registry/README.md`), then re-run.
Never edit the generated files directly.

> **Past learning (2026-09):** main's CI gate went red after a merge on 2026-09-21, and a same-day
> delisting had to delete its index tombstone by hand. Five root causes, all fixed in the generator or here:
> (1) This file (and `CLAUDE.md`) described the gate as `live_url`-only; the real gate also admits
> `repo_public` / `showcase`, and several shown entries have no `live_url` at all. (2) Kit-derived index
> content was regenerated from gitignored project folders, so CI, which never has them, "drifted"
> to the pre-baseline placeholder forever. Absent folder now means *unknown*: the committed content
> is carried forward. (3) The "as of" stamp was the newest git commit touching `registry/`. The
> documented regenerate-then-commit order stamped the previous commit's date, and a squash-merge
> re-dates the commit anyway, so no procedure could keep it stable. The stamp is now carried from
> the committed `README.md` and only moves when stamped content changes. Do **not** reintroduce a
> "restamp after the registry commit" step. (4) The generator had no cleanup pass and `--check`
> never looked for extra files, so a removed project's `<slug>-index.md` stayed tracked on a
> public repo. Orphans are now deleted and are drift. (5) `registry/README.md` claimed `mcps`
> publish only while `mcps_verified` is fresh; nothing read it. It is now documented as a
> maintenance re-probe duty, because a date-based gate would make `--check` depend on today.
