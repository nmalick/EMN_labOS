---
name: baseline-audit
description: Full project-os baseline for one project — recon, kit install + doc migration, code-verified audit fan-out, blind verification, improvement sweep, reconciliation, branch hygiene, baseline tag, review, registry/catalog sync, PR. Spawns repo-recon, repo-auditor, doc-verifier, reviewer.
disable-model-invocation: true
argument-hint: "<slug> [--surface …] [--resume <step>] [--dry-run] [--branch-rule=archive-tag] [--t3=defer-to-decisions-log] [--pr=auto-body]"
---

# /baseline-audit <slug>

The orchestrating session (never a subagent) runs this DAG. All reads target `origin/main`;
work lands on the repo's integration branch. PR convention: `templates/ops/pr-convention.md`.

| Step | Who | Gate / HALT |
|---|---|---|
| 0 Preflight | session | gh login asserted; clean tree; HEAD==origin/main; open-PR list; registry entry exists; refuse if cwd under the read-only reference tree |
| 1 Recon | repo-recon (haiku) | receipt shape; BUILD_CMDS captured |
| 2 Kit install + migration | session | mapping table honored; pre-migration `git grep` gate (runtime-referenced paths reclassified STAYS); pure `git mv` commit (SHA → history/) + separate link-rewrite commit |
| 3 Audit fan-out | repo-auditor ×N (opus) | one surface per invocation; receipts reconcile |
| 4 Blind verify | doc-verifier (haiku) | ⛔ GATE: MISSING_FILE+MISSING_SYMBOL empty (≤2 re-task rounds, then ESCALATED) |
| 5 Improvement sweep | repo-auditor --surface improvements | backlog + ops/verify.md + ref-map.md + debt rows |
| 6 Fix pass | code-fixer (via /improve) | separate skill; T1 + proven T2 only |
| 7 Reconciliation | session + auditor | superseded_by:, dup merges, aspirational re-marking |
| 8 Branch hygiene | session ONLY | ⛔ HARD HALT — branch disposition table. **Flag `--branch-rule=archive-tag` substitutes**: 0-ahead delete; unique→archive-tag(pushed)+history row+delete; worktree-checked-out/PR-head/integration branches NEVER. No subagent ever deletes branches |
| 9 Tag + CHANGELOG | session | annotated `baseline-<YYYY-MM>`; backfilled timeline above it |
| 10 Review | reviewer (opus) | ⛔ GATE: VERDICT != NO-SHIP; leakage always blocking (strictest when public-bound) |
| 11 T3 decisions | session | ⛔ HARD HALT — decision list. **Flag `--t3=defer-to-decisions-log` substitutes**: log + continue |
| 12 Registry + catalog | session | mcps from real inventory (+verified date); catalog_sync + --check; cross-checks (below) |
| 13 PR | session | ⚠️ SOFT HALT on body. **Flag `--pr=auto-body` substitutes**: PR-convention body, open, never merge |

Cross-checks (all four, every project): verifier claims-checked == auditor CLAIMS.cited ·
backlog rows == APPLIED+REVERTED+SKIPPED (post-fix) · product feature count == recon feature
count · in-doc Inferred tags == manifest INFERRED lines.

A HALT reached with no substituting flag in an unattended run ⇒ write ESCALATED to the
decisions log and continue with the next step that doesn't depend on it.

`--resume <step>`: read the step cursor from the integration branch's last commit trailer.

> **Past learning (2026-08):** before ANY push/PR step, assert `git rev-parse --show-toplevel`
> equals the target project's root. The dry run pushed the wrong repo's branch and opened a PR
> with the wrong body because a prior command had reset the shell cwd to the umbrella worktree.
> Every push/PR block now starts with the toplevel assertion.

> **Past learning (2026-08):** archive-tag pushes FAIL the pre-push author sweep when the
> archived branch's historical commits carry legacy/automation authors — that is the wall
> working, not a bug. Rule amendment: tags for legacy-authored history stay LOCAL-ONLY; the
> Phase-0 `--all` bundle is the offsite copy; history-doc recover pointers must carry the
> local-only caveat.

> **Past learning (2026-08, HIGH):** **Audit-then-fix in one range invalidates the audit.**
> Docs audited against `origin/main`, then code fixes applied in the same branch, leave
> citations pointing at deleted files and at bugs already fixed — the doc describes a tree that
> no longer exists at HEAD, and the blind-verify receipt certifies a stale ref. Caught by the
> reviewer on bil-app (backlog claimed "0 3, docs-only"; reality was `0 12` with 6 files
> modified and 2 deleted).
> **Rule — after ANY fix pass inside the audited range, before the reviewer gate:**
> 1. Repoint every surface: resolved bugs get a `RESOLVED at <sha>` banner (keep the pre-fix
>    description for provenance, never silently rewrite history);
> 2. Annotate citations to deleted/changed files as *(deleted at `<sha>` — pre-fix evidence)* —
>    the verifier classifies annotated ones as DOCUMENTED-HISTORICAL, unannotated as MISSING.
>    **The annotation must be in the `.citations` MANIFEST, not only the doc prose** — the
>    manifest is the machine-read surface (round-2 failure on bil-app: prose annotated, manifest
>    not, verifier still FAILed all 7). Doc-line refs in the manifest also drift when the doc
>    grows during remediation — re-derive them, don't trust the original;
> 3. Bump `verified_against:` on EVERY doc to the post-fix sha;
> 4. **Re-run the blind verify against the post-fix HEAD** — the pre-fix receipt is not evidence
>    for the range.
> Cheaper alternative for future baselines: split into two PRs (docs-at-ref, then fixes), or
> run the fix pass BEFORE the audit so the audit sees final state.
