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
- `freelance-projects/` — private client work (gitignored; omitted from the public catalog until live)
- `pocs/` — bil-app

## Catalog is generated, never hand-edited
`registry/*.md` is the source of truth → `/catalog-sync` emits `projects.json` + STATUS/ROADMAP/
RELEASE-NOTES + `docs/index.html`. Default-deny: only `visibility ∈ {public,anonymized}` with a
non-empty `live_url` ever reaches a public surface.
