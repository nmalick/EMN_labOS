# EMN_labOS — root context

Personal umbrella OS for Malick Ndiaye's projects. This public repo holds **only** OS files;
the actual project folders live here on disk but are **never tracked** (deny-all `.gitignore`).

## First, orient
- **Check [DIRECTORY.md](DIRECTORY.md) first** for where things live.
- Current focus: [now.md](now.md). Catalog/status: [STATUS.md](STATUS.md), [ROADMAP.md](ROADMAP.md).

## Identity (non-negotiable)
- Every commit authored `Malick Ndiaye <nmalicksn@gmail.com>`, pushed via GitHub **`nmalick`**.
- Before any git/gh op: `gh auth switch nmalick` and verify `gh api user --jq .login` → `nmalick`.
- Hooks in `hooks/` (via `core.hooksPath`) enforce author + block secrets/work-email on commit/push.
- **Hard wall with JourneyOS/Yaqeen:** this `.claude/` is self-contained; Personal MCP profile only.

## Buckets (all gitignored)
- `personal-projects/` — Qari, qari-assets, emnlabs_site
- `freelance-projects/` — art_is_everywear (client work; catalogued once live, omitted before that)
- `pocs/` — bil-app

## Standing conventions
- **Past learning**: when a skill/command run produces a wrong result, write the correction
  INTO the skill file as a dated `> **Past learning (YYYY-MM):**` block — don't merely fix the
  output.
- **Actionable-or-silent staleness**: a doc flagged stale in 3 consecutive maintenance runs
  auto-transitions to `ARCHIVED` (recorded); generated rosters delete stale entries rather than
  leaving tombstones; any count appearing in two files is generated from one source or not at all.

## Maintenance triggers
| Trigger | Action |
|---|---|
| Registry entry added/changed | `/catalog-sync` (CI's `--check` gate will catch you if you forget) |
| Global `~/.claude` config change | `scripts/snapshot.sh` (guard must pass) before committing `home-claude/` |
| Project merges PRs | `/update-ref <slug>` — refresh its architecture doc from the cursor |
| New project | `/new-project <slug>` — kit + registry + manifest |
| Weekly / after big changes | `/labos-maintenance` — freshness sweep, citation re-check, reference integrity, catalog+snapshot regen |
| A hook blocks a commit | Fix the cause (or extend `.labos-allow` deliberately) — **never `--no-verify`** |

## Catalog is generated, never hand-edited
`registry/*.md` is the source of truth → `/catalog-sync` emits `projects.json` + STATUS/ROADMAP/
RELEASE-NOTES + `docs/index.html`. Default-deny: only `visibility ∈ {public,anonymized}` with a
non-empty `live_url` ever reaches a public surface.
