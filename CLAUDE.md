# EMN_labOS — root context

Personal umbrella OS for Malick Ndiaye's projects. This public repo holds **only** OS files;
the actual project folders live here on disk but are **never tracked** (deny-all `.gitignore`).
This file also loads in every project session under the buckets, so it stays to rules that apply
everywhere.

@WORKING-RULES.md
@VOICE.md

## First, orient
- **Check [DIRECTORY.md](DIRECTORY.md) first** for where things live.

## Identity (non-negotiable)
- Every commit authored `Malick Ndiaye <nmalicksn@gmail.com>`, pushed via GitHub **`nmalick`**.
- Before any git/gh op: `gh auth switch -u nmalick` and verify `gh api user --jq .login` → `nmalick`.
- Hooks in `hooks/` (via `core.hooksPath`) enforce the author and block secrets and work
  identifiers on commit/push.
- **Hard wall with the work identity:** this `.claude/` is self-contained; personal MCP profile
  only. Work identifiers live only in the gitignored `hooks/identities.local` — never write them
  into a tracked file, a commit message, or a PR.

## Buckets (all gitignored)
`personal-projects/` · `freelance-projects/` (client work) · `pocs/`. Projects are catalogued in
`registry/`; the on-disk list is in [DIRECTORY.md](DIRECTORY.md).

## Standing conventions
- **Past learning**: when a skill/command run produces a wrong result, write the correction
  INTO the skill file as a dated `> **Past learning (YYYY-MM):**` block — don't merely fix the
  output.

## Maintenance triggers
| Trigger | Action |
|---|---|
| Registry entry added/changed/removed | `/catalog-sync`, then commit the registry change and the regenerated files together (CI's `--check` gate will catch you if you forget) |
| Global `~/.claude` config change | `scripts/snapshot.sh` (guard must pass) before committing `home-claude/` |
| Project merges PRs | `/update-ref <slug>` — refresh its architecture doc from the cursor |
| New project | `/new-project <slug>` — kit + registry + manifest |
| Weekly / after big changes | `/labos-maintenance` — freshness sweep, citation re-check, reference integrity, catalog+snapshot regen |
| A hook blocks a commit | Fix the cause (or extend `.labos-allow` deliberately) — **never `--no-verify`** |

## Catalog is generated, never hand-edited
`registry/*.md` is the source of truth → `/catalog-sync` emits `README.md` + `docs/` +
`registry/<slug>-index.md`. The default-deny publication gate is defined in `registry/README.md`;
clearing `live_url` alone does not unpublish.
