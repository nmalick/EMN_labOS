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
| 0.7 | 0 | Tracker + baseline + memory | ✅ | `c781b4d` | — |
| 1.1 | 1 | snapshot.sh hardened | ✅ | `c64a5d8` | Allowlist synthesis, no `rm -rf` of local half, worktree guard + override, CLIENT_TOKENS |
| 1.2 | 1 | PostHog spike | ✅ | — | Project-scope `enabledPlugins:false` documented valid; project beats user (moderate confidence — Phase 5 fresh-session check confirms; fallback = eviction hand-off item 2) |
| 1.3 | 1 | Project settings ×6 + .gitignore guards | ✅ | Qari `f777069` · emnlabs `62aa626` · qari-assets `f7a4f60` · art `0f0ce7b` · bil `fef6974` · umbrella `e0d5c3d` | emnlabs commit was BLOCKED by the OLD hook (false positive on `.gitignore` naming service-account file patterns) — deferred until 1.7, then passed by design, never `--no-verify`. Qari `settings.local.json` ×2 purged (CascadeProjects paths) + simulator grants relocated |
| 1.4 | 1 | Global settings surgery | ✅ | — | 15 stale entries removed (UDID, mushaf paths, dead `~/.claude-work` fragment, blanket home Read, `gh pr:*`); `additionalDirectories` = run-scoped 3 paths (final narrowing in Phase 5) |
| 1.5 | 1 | Global CLAUDE.md | ✅ | — | Model-policy contradiction resolved keep-Opus direction; tiering table; LLMA env-var prohibition; work-leaning scope line |
| 1.6 | 1 | Archive + delete personal residue | ✅ | — | agent-memory 9 files archived+deleted (verified identical first); plans: 15 work stay (incl. 2 boundary-referencing migration plans — conservative), 1 personal archived, executing plan PROTECTED; 5 global agents archived+deleted |
| 1.7 | 1 | Hooks hardening | ✅ | `c64a5d8` | identities.local (gitignored, staged-block asserted) + `.labos-allow`; scratch matrix 6/6; self-test commit passed; pre-push first-push hole closed + secret backstop |
| 1.8 | 1 | includeIf + smoke tests | ✅ | — | `gitdir/i:~/YaqeenProjects/**` after `[user]`; SMOKE B: virgin repo under YaqeenProjects resolves work email + passes work-profile hook; SMOKE C: JourneyOS resolves work email; personal profile proven by all run commits. Revert: delete includeIf block + `~/.gitconfig-work` |
| 1.9 | 1 | Eviction hand-off | ✅ | `6cea198` (stub) | Detail → JourneyOS `.claude-work/plans/global-work-eviction.md` (gitignored, repo untouched); pointer stub in umbrella |
| 2.0 | 2 | .gitignore surgery + tripwire | ✅ | `a6a8f1d` | /.github/ + /tests/ allowlisted (tripwire caught BOTH gaps live: canary file, then tests/); .claude narrowed; env anchored; check-tracked.sh in CI |
| 2.1 | 2 | Generator v2 + registry lib | ✅ | `0bc2a10` | Shared lib (single ROOT, loud validate); showcase eligibility (catalog 2→5); one allowlist path; deterministic + --check; 7/7 default-deny tests; ai-ops.html + projects-corpus.json + pointer indexes |
| 2.2 | 2 | Manifest policy reconciled | ✅ | `0bc2a10` | repo_public gating: 1 public row; 4 private/client rows → gitignored manifest.local.sh |
| 2.3 | 2 | CI + freshness gate + registry contract + opportunity_tool | ✅ | `b7626b2` | Catalog 5→6 (live deployed project was invisible); per-field publication decisions recorded |
| 2.4 | 2 | doc-kit templates v1 | ✅ | `06b0c13` | Full kit incl. cursor-headed arch template, event-typed history, T1/T2/T3 backlog, PR convention, ci-baseline with docs-freshness job |
| 2.5 | 2 | Umbrella doc corrections | ✅ | `a996afe` | DIRECTORY/CLAUDE/now/os-design/taxonomy — the 10-row checklist |
| 2.6a | 2 | Pages + metadata + push protection | ✅ | — | Pages live at nmalick.github.io/EMN_labOS (serves pre-rebuild docs from main until merge — recap note); push protection on both public repos |
| 2.6b | 2.6 | Fleet built (checker before maker) | ✅ | `3a09a21` | 3 reference skills + repo-recon/doc-verifier (haiku) + repo-auditor/reviewer (opus) + /baseline-audit with per-halt flags. Wall blocked the fleet's own commit once (literal reference path) — reworded, by design |
| 2.6c | 2.6 | Dry run: recon + kit + branches + verify-baseline | ✅ | — | Recon receipt OK (custom agent types register at session start — fallback: general-purpose + inline contract, recorded for Phase 3). Kit installed (public-safe rules). 8 local branches deleted (all 0-ahead; 7 remote refs → recap deferred-cleanup). Worktree pruned. VERIFY_CMD false-RED found + contract corrected (-I volatile fields) + Past-learning block written |
| 2.6d | 2.6 | Audits + blind verification | ✅ | qari-assets branch | Engineering 93 claims/0 inferred; history 151 claims/11 Inferred (promotion gate holds IN_PROGRESS pending owner review); blind verify: 392 citation lines, 0 missing/uncited. Real finds: manifest pins one tag behind latest release; workflow comment contradicts tag reality; README inventory incomplete; **KFGQPC charitable-use clause exists only in font name-tables → ACTION-REQUIRED** |
| 2.6e | 2.6 | Reviewer gate — 2× NO-SHIP, both correct | ✅ | rewritten range | R1 BLOCKING: my own 1.3 commit tracked the work-tree deny path into the PUBLIC repo (mechanical layers structurally can't catch it — the judgment layer did). Fixed by pre-push history rewrite; deny → settings.local.json. R2 BLOCKING: my rewrite orphaned a cited SHA (exists-but-unreachable — verifier's existence-only check passed it) + router CLAUDE.md still published the naive false-RED verify cmd. All fixed; doc-verifier contract gained the reachability check (`f3bc58c`). Delta re-review in flight |
| 2.7 | 2 | Reference playbooks committed | ✅ | `943e183` | 3 sanitized docs, token-scan clean (writer #2 died at spend limit mid-trim — files were complete on disk) |
| 2.6f | 2.6 | Delta re-review → SHIP; PRs open | ✅ | qari-assets PR #8 · umbrella PR #1 | All 4 dimensions PASS; reachability 27/27; amend-scope audited. Ship note: `[skip release]` needed in MERGE-COMMIT subject (recap runbook). Orchestrator cwd slip pushed umbrella branch + wrong PR body first — corrected; Past-learning block added to /baseline-audit (toplevel assertion before push/PR). **Phase 2.6 exit criterion MET** |
| 3.1 | 3 | Qari recon + kit + migration | ✅ | `6a29bca` (boundary) · `40b4717` (links) · `62b5838` (kit) | 165 pure renames; 3 dup pairs dedup-routed; qul-reference whole → knowledge-base; grep gate: zero code refs. Recon: 306 files/123 dart/176 docs/34 branches. Transient API stalls killed recon+3 auditors mid-write — all resumed from transcripts, zero loss |
| 3.2 | 3 | Qari 4-surface audit fan-out | ✅ | working tree | ~924 claims (913 cited, 22 Inferred): engineering 289/0 · product 86/0 · history 288/20 · ops 239/2. Riverpod myth evidenced across 10 docs; ADR-0001 stale-Proposed (shipped 4th option); direct-client inference call vs proxy mandate (T3 security); pin divergence confirmed (build tool at OLDEST tag); stale distribute trigger; AI-mode entry-point gap (possible regression, T3); word_selection_provider = probable stash residue. Ops: analytics negative re-verified; visibility inferred-claim resolved = PRIVATE (gh). **ACTION-REQUIRED: keystore + passwords exist ONLY on this machine — encrypted offline copy needed; stale iOS cert secrets check** |
| 3.3 | 3 | Qari blind verify + backlog + surfaces committed | ✅ | `7a876d3` | Verify: **978/978 clean** (2 documented unmerged-branch refs). Backlog: 227 claims, 14×T1 / 3×T2 / 8×T3 + dep-debt; sweep caught a live file in the seeded dead-list (barrel re-export) + more myth evidence (claimed MIT license — no LICENSE file; claimed integration tests — no dir). DIRECTORY.md added (dead router link fixed) |
| 3.4 | 3 | Qari T1 fix pass launched (14 items) · emnlabs recon launched | ▶ | — | code-fixer baseline-gated on rebuild/2026-08; [skip ci] discipline wired. T2-02 queued for gated pass; T2-01 → decisions (golden gate absent). Parallel: emnlabs recon incl. rescue-tag archaeology |
| 3.5 | 3 | Qari T1 fix pass | ✅ | 13 commits, ff'd to `d14469c` | 12/13 applied, each verified; net −3,271 lines; lint 454→417; 53/53 tests; T1-02 correctly skipped (live barrel); first attempt BASELINE_RED on a never-green zero-diagnostic gate → contract recalibrated (Past-learning #3) |
| 3.6 | 3 | Qari reconciliation + branch hygiene | ✅ | `9125199` + hygiene | T1-08 corpus README repaired; ADR-0001 outcome appended; superseded_by ×5; root README rewritten. Branches 34→3 legit; 3 archive tags **local-only** (pre-push author sweep blocked legacy-authored history — wall working; bundle = offsite copy; Past-learning #4); PR #69 head protected |
| 3.7 | 3 | Qari T2 pass (T2-03 flake-fix promoted + T2-02) | ▶ | — | code-fixer running on d14469c |
| 3.8 | 3 | emnlabs 4-surface audit | ✅ | working tree | ~875 claims (850 cited, 22 Inferred): eng 214/0 · product 138+2 (PARTIAL: APFS case-collision with legacy FEATURES.md — delivered as feature-inventory.md; kit past-learning) · history 170+15 (both eras via rescue tags) · ops+backlog 328+5. Fleet self-corrections: fixture-files catch (5 of 6 'orphans' are dynamic-import seeds), dead-stub trap (getProjectById always-null — naive lint fix would silently break), leaked key proven unreachable in new repo, my own seed claim refuted (seedFirestore exists) |
| 3.9 | 3 | emnlabs blind verify | ▶ | — | 11 docs incl. archive-tag citation classification |
| 1.11 | 1 | Hook-effectiveness canary | ✅ | — | Work token staged outside `.labos-allow` → BLOCKED by new hook (public-repo guard proven live); worktree-config layering fixed | 
| 1.10 | 1 | Snapshot + public-surface shrink | ✅ | `6cea198` | 4-file public snapshot; Telegram/SOXLA agent copies GONE from public repo; guard green (work+client classes); local half synced not destroyed. Note: `/doctor` is an interactive-CLI dialog — equivalent checks done (JSON validity, hook matrix, guard); interactive run listed in ACTION-REQUIRED |

## Config changes ledger (pre/post + revert one-liners)

| When | Change | Revert |
|---|---|---|
| P0 | Umbrella worktree branch `claude/emn-journey-os-architecture-10cda1` → `rebuild/2026-08` | `git checkout claude/emn-journey-os-architecture-10cda1` |
| P1 | GLOBAL `core.hooksPath` → rebuild-branch checkout | `git config --global core.hooksPath /Users/malick/EMN_labOS/hooks` |
| P1 | WORKTREE-level `core.hooksPath` (extensions.worktreeConfig=true; config.worktree pointed at primary = OLD hooks) → rebuild checkout | `git config --worktree core.hooksPath /Users/malick/EMN_labOS/hooks` |
| P1 | LOCAL umbrella `core.hooksPath` (was relative `hooks` → resolved to primary/main = OLD hooks) → rebuild checkout absolute | `git -C /Users/malick/EMN_labOS config --local core.hooksPath hooks` |

## Decisions log (T3 + ACTION-REQUIRED accumulator)

| # | Type | Item | Source |
|---|---|---|---|
| D-1 | ACTION-REQUIRED | Qari PR #69 merge decision (nastaleeq fix — 1 unique commit) | Phase 0 PR enum |
| D-2 | ACTION-REQUIRED | art PR #16 merge decision (firebase security-rule auto-deploy — 1 unique commit) | Phase 0 PR enum |
| D-3 | DEBT (dated 2026-08-02) | Work eviction from global — execute from a work session; detail at JourneyOS `.claude-work/plans/global-work-eviction.md` | Phase 1.9 |
| D-5 | ACTION-REQUIRED | qari-assets: KFGQPC charitable-use/no-print clause lives only in commit f614411 + font name-tables — promote to a repo-level license note before more public visibility? | Dry-run history audit |
| D-6 | ACTION-REQUIRED | qari-assets: was a GitHub Release ever published for tag qari-assets-4 (tag exists, workflow comment says never cut)? | Dry-run audits |
| D-7 | DECISION (11 items) | qari-assets history/CHANGELOG: 11 `Inferred — needs review` markers (4 backfilled decisions + 7 reconstructed release sections) — owner review promotes IN_PROGRESS → READY | Promotion gate |
| D-8 | ACTION-REQUIRED (CRITICAL) | Qari: make an encrypted offline copy of qari-release.jks + its 3 passwords (exist only on this machine + write-only GH secrets); record date/location in ops/secrets.md | Qari ops audit |
| D-9 | ACTION-REQUIRED | Qari repo settings: do the 3 stale iOS cert/profile secrets still exist post-c42a31a (iOS job removed)? Delete or re-establish | Qari ops audit |
| D-10 | T3 | Qari: salvage verse_matcher_service.dart (148 LOC, no main equivalent) + record ^6 iOS fix before archiving the whisper branch? | Qari history audit |
| D-11 | T3 (security) | Qari: AI-mode calls the inference API directly from the client with a build-time token (plan mandated a proxy) — accept, proxy, or gate? | Qari product audit |
| D-12 | T3 | Qari: AI-mode banner mounted only in mushaf view — staging or regression? · word_selection_provider.dart (288 LOC, zero importers, probable stash residue) keep/drop | Qari eng+history audits |
| D-13 | T3 (privacy) | emnlabs: Session Replay sampleRate:1, no masking/consent, no /privacy route, while /lets-talk collects name/email/text — posture decision | emnlabs audits ×3 |
| D-14 | T3 (security) | emnlabs: /firebase-debug publicly routable in prod; unauthenticated unmetered /api/chat (hardening T2 staged, spend-cap console step yours) | emnlabs audits |
| D-15 | INPUT NEEDED | emnlabs: exact production origin list for the Friday CORS lock (emnlabs.io + www + *.vercel.app previews?) — T2-03 applies it | emnlabs ops audit |
| D-16 | ACTION-REQUIRED | Firestore backups/PITR console check (both emnlabs + art) — contactMessages/orders are the non-reproducible collections | emnlabs ops audit |
| D-4 | ACTION-REQUIRED | Run interactive `/doctor` once in a fresh session (dialog command — not invocable unattended) | Phase 1 gate |

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
