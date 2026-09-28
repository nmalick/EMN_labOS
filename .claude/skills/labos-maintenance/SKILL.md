---
name: labos-maintenance
description: Umbrella maintenance suite — doc TTL/citation freshness sweep, reference-integrity check, catalog + AI-ops + corpus regen, clone-list drift, snapshot refresh, health-metrics diff. Reports always; opens a PR only if files changed.
disable-model-invocation: true
argument-hint: "[--auto] [--project <slug>]"
---

# /labos-maintenance

Sequential; each step independently useful. Report to `claude-output-docs/history/` always;
local notification only on ISSUES FOUND.

| Step | What | Gate |
|---|---|---|
| 1 TTL/freshness | `scripts/check-freshness.py` per project-os tree (via registry) | list stale → queues `/update-ref` |
| 2 Citation re-check | `doc-verifier` (haiku) on each project's docs — catches code that moved AFTER verification | reachability on |
| 3 Reference integrity | validate every `@agent-*` / `/<skill>` ref across `.claude/` + `project-os/` against the LIVE roster (filesystem-path checks miss dangling refs — the rot that survives months) | |
| 4 Catalog + AI-ops + corpus + pointer indexes | `catalog_sync.py` (default-deny holds) + connector pre-flight re-probe for `mcps` freshness | `--check` clean |
| 5 Replication | `collect-local-registry.py` then `check_clone_list.py` — the clone list is hand-maintained, so this is the only thing that catches a repo missing from a fresh machine | drift reported, never auto-fixed |
| 6 Snapshot | `scripts/snapshot.sh` (from the primary checkout), then `labos-config.sh status` to show whether the private half is behind its repo | work+client guard must pass |
| 7 Health | `/context` + `/doctor` numbers; routing-probe diff vs the committed baseline | record |

`--auto` skips only the PR-body soft halt. Actionable-or-silent staleness: a doc stale in 3
consecutive runs auto-transitions to `ARCHIVED` (recorded). Commits + opens a PR only when files
changed.
