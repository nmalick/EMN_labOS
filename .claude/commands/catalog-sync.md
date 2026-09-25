---
description: Regenerate every public surface (the README catalog table, docs/, and the
  registry/<slug>-index.md pointers) from registry/*.md. Default-deny — a project shows only when
  public/anonymized AND (live_url OR repo_public OR showcase).
---

# /catalog-sync

Regenerate the public catalog from `registry/*.md`.

## Run
```bash
python3 scripts/catalog_sync.py
python3 scripts/catalog_sync.py --check
```
1. Edit `registry/<slug>.md`, then run the generator. Review the printed
   `SHOWN / OMITTED (why) / REMOVED` summary.
2. `--check` must be clean. It passes only when a write run would change nothing, and CI runs the
   same check on a clean checkout — so a clean local `--check` means a green gate.
3. Commit the registry change and the regenerated files together, with a neutral message: no
   project or client names in the log. Order does not matter, because nothing generated depends on
   git history. Never hand-edit the "as of" stamp.

## Rules
- `registry/<project>.md` frontmatter is the single source of truth. The catalog is generated,
  never hand-edited, so a private project cannot be named in hand-written prose.
- **Publication gate (default-deny):** `visibility ∈ {public, anonymized}` AND (`live_url`
  non-empty OR `repo_public: true` OR `showcase: true`) — `is_public()` in
  `scripts/lib/registry.py`.
- `showcase: true` alone publishes, so clearing `live_url` does **not** unpublish a project. This
  repo is public and the registry file itself is world-readable, so a full delist means deleting
  the entry, not setting `visibility: private`.
- **Kit pointers** (`registry/<slug>-index.md` body, corpus `doc_index`) come from each project's
  gitignored `project-os/`. Run from the primary checkout to refresh them. In a worktree or in CI
  those folders are absent and the committed content is carried forward — the summary tags such
  projects `[kit carried forward: …]`.
- **Removing a project:** delete `registry/<slug>.md` and run. The orphaned index file is deleted
  automatically (`REMOVED` line), and `--check` fails if one survives. Then grep the hand-written
  prose (`DIRECTORY.md`, trackers) — the generator cannot.

## Adding or updating a project
Edit or add `registry/<slug>.md` frontmatter (`name, slug, bucket, visibility, status, showcase,
live_url, repo_url, repo_public, stack, summary` — contract in `registry/README.md`), then re-run.
Never edit the generated files directly.

> **Past learning (2026-09):** main's CI gate went red after a merge on 2026-09-21, and a same-day
> delisting had to delete its index tombstone by hand. Five causes, all fixed in the generator or
> here:
>
> 1. This file and `CLAUDE.md` described the gate as `live_url`-only. The real gate also admits
>    `repo_public` and `showcase`, and several shown entries have no `live_url` at all.
> 2. Kit-derived index content was regenerated from gitignored project folders, so CI — which never
>    has them — drifted to the pre-baseline placeholder forever. An absent folder now means
>    *unknown*, and the committed content is carried forward.
> 3. The "as of" stamp was the newest git commit touching `registry/`. Regenerate-then-commit
>    stamped the previous commit's date, and a squash-merge re-dates the commit anyway, so no
>    procedure could keep it stable. The stamp is now carried from the committed README and moves
>    only when stamped content changes. Do **not** reintroduce a "restamp after the registry
>    commit" step.
> 4. The generator had no cleanup pass and `--check` never looked for extra files, so a removed
>    project's `<slug>-index.md` stayed tracked on a public repo. Orphans are now deleted and count
>    as drift.
> 5. `registry/README.md` claimed `mcps` publish only while `mcps_verified` is fresh; nothing read
>    it. It is now documented as a maintenance re-probe duty, because a date-based gate would make
>    `--check` depend on today's date.
