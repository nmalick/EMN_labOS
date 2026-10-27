---
title: 2026-10 — SOXLA moves off WordPress; new project, catalog generator fix
type: history
project: labos
status: COMPLETE
owner: Malick
created: 2026-10-26
updated: 2026-10-26
last_verified: 2026-10-26
verified_against: n/a (historical record)
# An immutable record: its claims were true at the time, so it carries a long TTL
# rather than asking to be re-verified every year.
ttl_days: 3650
sources: git-history
confidence: confirmed
---

# 2026-10 — SOXLA migration session (2026-10-25 → 26)

**Takeaway:** soxla.io's WordPress.com site was audited, archived and replaced by a new private
project, `soxla`, deployed on Vercel. The project was then paused; its own
`project-os/plans/tracker.md` holds the next steps. On the labOS side the session added one
registry entry, fixed a catalog-generator rendering bug, and synced the private config half.

## What changed in labOS

| Change | Where | Evidence |
|---|---|---|
| New project scaffolded by the `/new-project` rules (applied by hand: the skill is user-invoke-only) | `personal-projects/soxla` (own private repo, doc kit, router, `.claude/settings.json`) | project repo `89a349a`, `be9f0ec`, `96170ff` |
| Registry entry: public catalog row, `repo_public: false`, `live_url` set, `docs_status: partial` | `registry/soxla.md` | PR #18 |
| Catalog regenerated | `README.md`, `docs/`, `docs/projects-corpus.json`, `registry/*-index.md` | `catalog_sync.py --check` clean |
| Generator fix: `<slug>-index.md` lost the opening `**` of its cursor line (`lstrip(">* ")`) and dropped the table separator row, so no index rendered a table | `scripts/catalog_sync.py` `read_project_index`; regression asserts in `tests/test_default_deny.py` | both fixes mutation-checked: reverting either fails the test |
| On-disk project list corrected (soxla added; `ar-character` and `minesweeper` had been missing since #17) | `DIRECTORY.md` | `ls` of the bucket folders |
| Clone-list row for the new repo | private config repo | `check_clone_list.py` clean (9 rows) |
| Private half synced: memory for the migration and two tool limits, plus pending global changes | private config repo via `snapshot.sh` + `labos-config.sh push` | public half unchanged, token scan clean |

## Project outcome (details live in the private project repo)

- WordPress.com Atomic site (ExpertHive theme, HivePress, WooCommerce, 35 plugins) had sat behind
  "coming soon" with indexing off for its whole life. Its data and media were exported into the
  private repo; the audit sits in its `project-os/research/`.
- A Next.js 16 page with a waitlist was built and deployed to the project's `*.vercel.app` URL.
- 2026-10-26: the owner paused the project. The page will shrink to a one-field "keep me updated"
  placeholder in a new session. DNS stays at WordPress.com until then; the owner switches it by hand.

## Learnings

1. **`create-next-app` inside the umbrella skips `git init`** — it sees the umbrella's `.git` above
   the gitignored bucket. Run `git init` in the project before the first commit, or the first
   `git log` shows umbrella history.
2. **Work on a bucket project from its own folder.** From an umbrella worktree session, a hook
   blocks the Edit tool on `personal-projects/*` (it protects the primary checkout), even though
   the bucket is gitignored and has its own `.git`.
3. **Fresh kit pointers need the project folders.** In a worktree, `catalog_sync.py` carries index
   content forward; to refresh it, symlink the bucket projects into the worktree's gitignored
   bucket dirs for the run, then remove the links and confirm `--check` stays clean.
4. **A worktree can hold stale copies of gitignored machine files** (`hooks/identities.local`,
   `home-claude.local/`). `snapshot.sh` reads the worktree's copy first, and `labos-config.sh push`
   pointed at a worktree would publish it. Compare with the primary checkout before either.
5. **Vercel MCP cannot create Blob stores** (403), and the machine's `vercel` CLI token was expired:
   store creation is an owner step in the dashboard.
6. **Claude in Chrome allows one automatic download per tab**; bundle exports into one file.

## Open after this session

- Merge PR #18 (owner).
- Project-side owner steps (Blob store, DNS switch, retiring WordPress while keeping the domain)
  are tracked in the project's own `project-os/plans/tracker.md`.
