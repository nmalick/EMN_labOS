# Rebuild 2026-08 — Execution Tracker

> Live status of the unattended rebuild run. Updated after every task. Plan: `~/.claude/plans/magical-splashing-phoenix.md` (v3, approved 2026-08-02). Raw research: `~/Archive/labos-rebuild-2026-08/reports/` (22 files, private).

## Task log

| ID | Phase | Task | Status | Commit/PR | Notes |
|---|---|---|---|---|---|
| 0.1 | 0 | Archive dir + 22 reports preserved | ✅ | — | `~/Archive/labos-rebuild-2026-08/reports/` (prefixed, collision fixed) |
| 0.2 | 0 | `~/.claude` config backup | ✅ | — | rsync, 7.2MB, transcripts excluded |
| 0.3 | 0 | emnlabs history rescue | ✅ | — | Tags `archive/pre-reset-main` (a69bfef) + `archive/opportunity-tool` (57e9d9d); 75MB bundle verified, **credential-bearing — never push/share**; gc disabled during op |
| 0.4a | 0 | Per-repo fetch/bundle/fsck | ✅ | — | 6/6 bundles verified OK. Qari 42 unreachable objects (recorded); others 0 |
| 0.4b | 0 | Stash exports | ✅ | — | Qari ×2, bil ×1 → `stash-patches/` (first bil export was mis-cd'd, redone correctly); stashes kept in repos |
| 0.4c | 0 | bil-app dirty-tree rescue | ✅ | `bil-app@3f96724` | 8 files, 786+/770− → `wip/rescue-2026-08`, pushed; main clean |
| 0.4d | 0 | art untracked inventory | ✅ | — | `v1_assets/` 20MB client media — inventoried, left in place, NOT committed |
| 0.4e | 0 | Branch normalization + topology | ✅ | — | All 6 repos: HEAD==origin/main; `rebuild/2026-08` cut everywhere; umbrella worktree switched onto it. emnlabs main FF'd +2, art main FF'd +40. Note: `origin/landingPageDeployment` (bil) was already deleted remotely — prune removed the stale ref |
| 0.5 | 0 | Assertions | ✅ | — | gh=`nmalick` · `CLAUDE_CODE_SUBAGENT_MODEL` UNSET |
| 0.5b | 0 | Open-PR enumeration | ✅ | — | Qari #69 (`claude/nastaleeq-font-and-pagination`), art #16 (`claude/firebase-setup-scope-rkr9y8`) — both heads **PROTECTED** |
| 0.6 | 0 | Registry quick-fixes | ✅ | `030d323` | art summary/stack (checkout-era claims removed), Qari stack (Riverpod dropped), showcase flags ×3 |
| 0.7 | 0 | Tracker + baseline + memory | ✅ | this commit | — |

## Config changes ledger (pre/post + revert one-liners)

| When | Change | Revert |
|---|---|---|
| P0 | Umbrella worktree branch `claude/emn-journey-os-architecture-10cda1` → `rebuild/2026-08` | `git checkout claude/emn-journey-os-architecture-10cda1` |
| (pending P1) | `core.hooksPath` → rebuild-branch checkout | `git config --global core.hooksPath /Users/malick/EMN_labOS/hooks` |

## Decisions log (T3 + ACTION-REQUIRED accumulator)

| # | Type | Item | Source |
|---|---|---|---|
| D-1 | ACTION-REQUIRED | Qari PR #69 merge decision (nastaleeq fix — 1 unique commit) | Phase 0 PR enum |
| D-2 | ACTION-REQUIRED | art PR #16 merge decision (firebase security-rule auto-deploy — 1 unique commit) | Phase 0 PR enum |

## Debt register

| # | Repo | Item | Tier | Notes |
|---|---|---|---|---|
| — | — | *(populated by Phase 3 audits)* | — | — |

## Repo state snapshot (end of Phase 0)

| Repo | HEAD | rebuild/2026-08 | Bundle | Stashes | Notes |
|---|---|---|---|---|---|
| Qari | main @ origin/main (224 commits) | ✓ | ✓ | 2 (patched) | 42 unreachable objects; on-disk checkout was feat/qari-mode-round-2 (0-ahead) |
| emnlabs_site | main @ origin/main | ✓ | ✓ | 0 | Rescue bundle separate; `restore-friday-chatbot` was checked out (merged) |
| qari-assets | main @ origin/main | ✓ | ✓ | 0 | PUBLIC repo |
| art_is_everywear | main @ origin/main (41 commits) | ✓ | ✓ | 0 | v1_assets/ untracked 20MB left in place |
| bil-app | main @ origin/main | ✓ | ✓ | 1 (patched) | wip rescue pushed |
| EMN_labOS | rebuild/2026-08 @ origin/main | ✓ | ✓ | 0 | PUBLIC repo; primary checkout stays on main |
