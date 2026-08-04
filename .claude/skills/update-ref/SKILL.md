---
name: update-ref
description: Post-merge doc refresh for a project — reads merged PRs/commits since the arch-doc cursor, re-audits only the affected project-os surfaces, re-verifies citations, opens a reviewable PR. Never auto-commits to main.
disable-model-invocation: true
argument-hint: "<slug> [--since <sha>]"
---

# /update-ref <slug>

Incremental — reads the cursor, refreshes only what changed. Never a full re-audit.

1. Read the cursor from `project-os/engineering/architecture.md` (`Last commit checked: <sha>`).
2. `git log <cursor>..origin/main --oneline` (repos with PRs: `gh pr list --state merged --json
   number,title,mergedAt,body` since the cursor date). Zero new commits → report "current", stop.
3. **Impact triage** via `project-os/ops/ref-map.md`: map each change to affected doc sections;
   read full file contents only for structurally-changed files.
4. `repo-auditor` (sonnet; opus override for large changes) re-audits ONLY the affected surfaces
   → citation manifests. `doc-verifier` (haiku) on the changed docs — reachability check on.
5. Append a `## Maintenance Log` row (date · commits covered · notable changes); advance the
   cursor.
6. ⚠️ SOFT HALT on the PR body (`--auto` substitutes) → open PR per `templates/ops/pr-convention.md`.
   Flag-don't-auto-update anything needing human judgment.

Generalizes the per-product update-ref pattern into one parameterized skill.
