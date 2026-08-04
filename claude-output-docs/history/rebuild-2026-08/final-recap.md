# EMN_labOS rebuild 2026-08 — FINAL RECAP (merge runbook)

**Status:** rebuild complete on the automation side. Nothing below was merged by automation —
every merge is yours, in the order given. Plan of record: `~/.claude/plans/magical-splashing-phoenix.md`
(v3); state file: `~/.claude/plans/labos-rebuild-handoff-2026-08-04.md`; task log: `tracker.md`
(this directory).

## 1) Merge runbook — open PRs, in merge order

| # | Repo | PR | What | Merge method | Prerequisites / notes |
|---|---|---|---|---|---|
| 1 | EMN_labOS | (this PR — `rebuild/phase45`) | Phase 4b/5 tail: permanent fleet roster (+3 verifier contract upgrades), after-metrics, restore-test evidence, closeout config, this recap | **Merge commit** (tracker/recap cite branch SHAs) | CI green (catalog `--check` + default-deny tests ran clean locally 2026-08-04) |
| 2 | Qari | [#72](https://github.com/nmalick/Qari/pull/72) | Leak removal: work-tree deny path out of tracked settings + closeout ask-block | Merge commit preferred | None. History rewrite of main to purge the string = separate decision, default **no** (§3) |
| 3 | emnlabs_site | [#3](https://github.com/nmalick/emnlabs_site/pull/3) | Same leak removal + closeout ask-block | Merge commit preferred | Same as above |
| 4 | qari-assets | [#9](https://github.com/nmalick/qari-assets/pull/9) | Closeout ask-block only | Either | ⚠️ **Type `[skip release]` into the merge-commit subject at merge time** — the workflow has no `paths:` filter; the PR-title default will NOT carry the marker (PR #8 lesson: `qari-assets-8` was cut by a docs-only merge) |
| 5 | bil-app | [#1](https://github.com/nmalick/bil-app/pull/1) | Full 2026-08 baseline: project-os kit (12 surfaces, 435-entry manifests), route-shadowing fix, import fix, landing T1s, tag `baseline-2026-08` | **Merge commit required** (doc cursors + tag reference in-branch SHAs; squash orphans them) | Verify rounds 4–6 PASS; reviewer SHIP after 4 rounds. Backlog T2-1/T2-2/T2-3 + T3s stay open (T3-4 revive-vs-archive gates the rest) |
| 6 | art_is_everywear | [#17](https://github.com/nmalick/art_is_everywear/pull/17) | Additive-only baseline: project-os kit (13 surfaces, 1,428-entry manifests), .gitignore credential patterns, tag `baseline-2026-08` | **Merge commit required** (same reason) | Branch was history-rewritten **twice** pre-push: (1) purge a work-org settings path; (2) drop 20MB `v1_assets/` client media the first rewrite had silently swept in (now gitignored; reviewer catch). Client decisions in §2 stay open |

Pre-existing user PRs — **your decision, untouched by the rebuild**: [Qari #69](https://github.com/nmalick/Qari/pull/69)
(nastaleeq fix, 1 unique commit), [art #16](https://github.com/nmalick/art_is_everywear/pull/16)
(security-rules auto-deploy; its head `b64a209` is cited as evidence by art's history docs — merging or
closing keeps the branch resolvable either way as long as the branch isn't deleted).

Merged during the run (by you): umbrella PR #1, Qari #71, emnlabs #2, qari-assets #8.

**After merges:** GitHub Pages serves pre-rebuild `docs/` from `main` until PR #1 (row 1) merges —
stale-content note stands until then. Then re-run `/catalog-sync` on main if any registry row changed.

## 2) ACTION-REQUIRED (user decisions & console steps — automation never acts on these)

| # | Item |
|---|---|
| D-8 ⚠️CRITICAL | Qari: encrypted **offline copy of qari-release.jks + its 3 passwords** (exist only on this machine + write-only GH secrets); record date/location in ops/secrets.md |
| D-16 | Firestore **backups/PITR console check** for emnlabs (`contactMessages`) and art (`orderRequests`) — the non-reproducible collections |
| — | emnlabs: **Anthropic workspace spend cap** (public unmetered `/api/chat` — the cap is the only true backstop) |
| — | art: **split-brain env check** — if prod leaves `NEXT_PUBLIC_USE_SEED_DATA` unset, the storefront renders demo catalog while live order writes are accepted (fails OPEN; two independent switches). Needs a Vercel env read (`vercel whoami` probe rule; automation never runs `vercel login`) |
| — | art: nothing notifies the studio on a new order request; dormant Stripe path keep-vs-prune; `Photos-1-001.zip` disposition; `v1_assets/` 20MB media disposition (T3-4 — kept untracked+gitignored by the rebuild) |
| D-1 / D-2 | Qari #69 and art #16 disposition (see above) |
| D-5 / D-6 | qari-assets: KFGQPC license note promotion; was a Release ever published for `qari-assets-4`? |
| D-9 | Qari repo settings: 3 possibly-stale iOS cert/profile secrets post-c42a31a — delete or re-establish |
| D-11 | Qari: AI-mode calls inference API directly from client with build-time token (plan mandated proxy) — accept/proxy/gate |
| D-13 | emnlabs: Session Replay sampleRate:1, no masking/consent, no /privacy route while /lets-talk collects PII — posture decision |
| D-14 | emnlabs: `/firebase-debug` publicly routable in prod; unauthenticated `/api/chat` (hardening T2 staged behind D-15) |
| D-15 | emnlabs: exact production origin list for the Friday CORS lock (T2-03 applies it) |
| D-7 | qari-assets: 11 `Inferred — needs review` markers await owner review (promotes IN_PROGRESS → READY) |
| D-4 | Run interactive `/doctor` once in a fresh session |
| — | QUL licensing `[unverified]` — gates ANY public Qari surface or store release |
| — | Rewrite Qari/emnlabs private mains to purge the leaked deny-path string? Default **no** (repo-private, string is a path not a credential); revisit on any visibility flip |
| — | Remote-branch cleanup (deferred by rule): remote branches were never deleted this run; see tracker branch-hygiene rows for the archive-tagged list |

## 3) Accepted-risk register

| Risk | Rationale / trigger to revisit |
|---|---|
| Unified Claude account across personal+work | Process-level separation (profiles, hooks, identity wall caught 5 real mistakes this run); revisit if account-level isolation becomes available |
| Manual connector (MCP) account groups | No API to pin; `mcps:` freshness gated by `verified_on` ≤90d probes |
| No secret-scanning push protection on private repos | GitHub requires GHAS; the two public repos have it. Trigger: any visibility flip |
| emnlabs tracked client web API key (3 `scripts/*.js`) | User decision; repo private; path-scoped hook exception. Trigger: visibility flip (recorded in emnlabs `ops/secrets.md`) |
| emnlabs leaked service key survives in the rescue bundle | Bundle labeled credential-bearing, never push/share/index |
| bil LAN IP + demo-era residue in project-os surfaces | Private repo; tracked as bil T3-1; re-check if project-os ever goes public |

## 4) Debt register

| # | Item |
|---|---|
| D-3 | **Global work eviction** — execute from a work session; detail at JourneyOS `.claude-work/plans/global-work-eviction.md`; umbrella stub in `claude-output-docs/plans/work-eviction-handoff.md` |
| ENV-1 | `code-fixer` `isolation: worktree` defect on nested gitignored repos — orchestrator ran fix loops directly this run; fix before the next fleet fix-pass |
| — | qari-assets `auto-release.yml` lacks `paths:` filter (T2) — every merge risks an empty release without the typed marker |
| — | emnlabs T2-01 (chat contract test), T2-03 (CORS lock, blocked on D-15) staged not applied |
| — | bil T2-1 (vercel framework manifest — needs preview-deploy gate), T2-2 (nav-types collapse), T2-3 (signup stub) |
| — | Per-repo deps-debt rows live in each `project-os/plans/improvement-backlog.md` |

## 5) Process lessons encoded this session (already in the fleet contracts)

- doc-verifier: INFERRED pairing is a **bijection**; past-EOF (`SRC_LINE_OOB`); `BAD_FIX_ATTRIBUTION`
  (`git show --stat` every RESOLVED/APPLIED SHA); `TRACKING_CLAIM` (tracked/untracked claims verify
  via `git ls-files`/`check-ignore`, not citations).
- History rewrites: after ANY squash/rewrite, sweep every doc+manifest for now-dangling SHAs
  (reachability = origin/main ∪ branch ∪ open-PR heads) **and** re-diff the squashed commit against
  intent — the art rewrite silently absorbed 20MB of untracked client media.
- Tags of record move with remediation: retag at the reviewed tip, never leave a mid-remediation tag.
