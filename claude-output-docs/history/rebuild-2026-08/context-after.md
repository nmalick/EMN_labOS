---
title: Context & routing — after-metrics vs the Phase-0 baseline
type: ops
project: labos
status: COMPLETE
owner: Malick
created: 2026-08-04
updated: 2026-08-04
last_verified: 2026-08-04
verified_against: n/a (runtime measurement)
ttl_days: 180
confidence: confirmed
---

# After-metrics — 2026-08-04

Compare against [`context-baseline.md`](context-baseline.md) (captured 2026-08-02, pre-rebuild).

## Goal 2 — routing cost per question

**Before**: ~24 standing questions across the portfolio required ~250K tokens of file-opens,
**8 of them had docs that were actively wrong** (so the reader also had to detect the lie), and
1 was unanswerable at any price (the deleted predecessor history).

**After**: every question is answered by **2 file-opens** — the project's `project-os/DIRECTORY.md`
(the router) then the one doc it points at — with no source-tree grep. Verified per project:

| Project | Probe question | Route | Answer present |
|---|---|---|---|
| Qari | what manages state? | DIRECTORY → engineering/architecture.md | ✓ singleton `ChangeNotifier`s (the "Riverpod" claim is corrected in-doc) |
| emnlabs_site | how does Friday get its knowledge? | DIRECTORY → architecture.md | ✓ the two static skill files + module cache |
| bil-app | what endpoints exist? | DIRECTORY → architecture.md | ✓ the real 9-route table (13 `/api/v1` references) |
| art_is_everywear | how do customers order? | DIRECTORY → architecture.md | ✓ the made-to-order request flow |

The architecture docs are 5K–10K tokens each — an order of magnitude below the before-state's
per-question cost, and they are the *first* read rather than the last.

**Lying docs**: 0 remain in the routed path. Every myth found (Riverpod, GoRouter/Hive/Firebase,
"AI-powered insights", the fabricated backend endpoint list, "complete" components that never
existed, the checkout-era storefront description) is either corrected in place or carries
`superseded_by:`/RESOLVED provenance.

**Unanswerable → answerable**: emnlabs' pre-reset history was rescued in Phase 0 and mined into
its history doc; the provenance bundle lives off-repo.

## Goal 3 — global config surface

| Metric | Before | After |
|---|---|---|
| `permissions.allow` entries | 32 (20+ hardcoding one stale session incl. a simulator UDID) | **17** |
| `additionalDirectories` | `["/Users/malick"]` — blanket home-dir read from every session | **removed entirely** (the umbrella's own project settings carry its scoped grant) |
| Permission keys at global scope | `allow` + `additionalDirectories` | `allow` only |
| Global agents | 5 (2 project-specific, 1 dead integration, 2 with dangling refs) | **0** — the roster is project-scoped |
| Public snapshot files | 9 (incl. un-genericized agent copies naming a dead integration and a stale codename) | **4**, allowlist-synthesized |
| Dead/orphaned global state | `agent-memory/` for a defunct project; a bootstrap fragment pointing at directories that never existed | archived off-repo, removed |

## Durability evidence

- Fresh-machine restore test: **9/9** ([restore-test.md](restore-test.md)) — including a planted
  canary proving retired agents are now *pruned*, not merged, on every future machine.
- CI on the umbrella: default-deny regression tests, catalog drift gate, silent-swallow
  tripwire, and a deterministic doc-freshness gate (TTL / citation rot / stale base).
- The identity wall blocked **five** real mistakes during this run (including four of the
  orchestrator's own), and was never bypassed.
