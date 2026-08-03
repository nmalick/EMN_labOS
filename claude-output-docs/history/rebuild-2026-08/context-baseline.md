# Context & Routing Baseline — before the 2026-08 rebuild

Captured 2026-08-02 at Phase 0/1 boundary. The Phase 5 after-measurement diffs against this file. Goal-2 evidence: "any Claude surface finds project information cheaply."

## Machine/config surface (before)

| Metric | Value | Source |
|---|---|---|
| `~/.claude` total size | 313MB (293MB session transcripts under `projects/`) | du, Phase 0 |
| Global `settings.json` permission entries | 32 (20+ hardcode one stale Qari session incl. simulator UDID; dead `~/.claude-work` symlink fragment; `additionalDirectories: ["/Users/malick"]` blanket grant) | research-global-config |
| Global agents | 5 (2 project-specific, 1 dead Telegram integration, 2 with dangling refs) | research-global-config |
| Global `agent-memory/` | 2 orphaned namespaces, 9 files, dead project (Tandem) | research-global-config |
| `~/.claude/plans/` | 16 files (~12 work, in the unscoped global dir) | verify pass |
| Skill-roster pollution in a personal session | ~163 entries, **130 (~80%) are the work PostHog plugin**; 109 already description-truncated (budget saturated) | stress-redteam-wall |
| Work commands injected when JourneyOS is an additional dir | 26 commands ≈ 1.7K tokens | stress-redteam-wall (observed live) |
| `CLAUDE_CODE_SUBAGENT_MODEL` | UNSET (verified — frontmatter tiering active) | Phase 0.5 |

## Routing probe (before) — tokens/files to answer 5 standing questions per project

Methodology: for each question, the files a fresh session must open **today** (no `project-os/`) to answer correctly, per the verified scan reports; ≈tokens = file bytes ÷ 4. "Docs misleading" = a doc exists that answers it WRONG (worse than absent — the session must also detect the lie).

### Qari
| Q | Answerable from docs today? | Files to open | ≈tokens |
|---|---|---|---|
| What manages state? | **Docs lie** (README/CLAUDE.md say Riverpod; reality: 9 singleton ChangeNotifiers) | README + CLAUDE.md + grep sweep + ≥4 source files | ~25K |
| Where is the mushaf variant selected? | No doc; source archaeology | `mushaf_settings/` + `navigation_tab_content.dart` (618 LOC) + service | ~20K |
| What pins the asset tag? | No doc | `asset_manifest_service.dart` + `build_v4_rules.py` + qari-assets manifest | ~12K |
| What does AI mode call? | Plan docs partial/stale | `ai_mode_recording_sheet.dart` (951 LOC) + service + credentials | ~30K |
| What shipped in the last quarter? | **No changelog, no tags** | git log archaeology + PR list | ~15K |

### emnlabs_site
| Q | | | |
|---|---|---|---|
| How does Friday get its knowledge? | No doc (README predates Friday) | `api/chat.js` + SKILL.md + career-profile.md | ~12K |
| What is the content source of truth? | **Ambiguous** (src/data vs Firestore unresolved in any doc) | firestore.js + hooks + 7 data files | ~18K |
| What analytics run on the live site? | **Undocumented** (Amplitude + Session Replay ship in prod) | package.json + main.jsx + rescued history | ~10K |
| How is the site deployed? | Partial (stale README) | vercel.json + README + Vercel dashboard | ~6K |
| What was built before the history reset? | **Impossible before Phase 0** (repo deleted; dangling commits unprotected) | — | ∞ → now: rescue bundle |

### bil-app
| Q | | | |
|---|---|---|---|
| What endpoints exist? | **README 100% wrong** (zero overlap) | `bil-backend/src/index.ts` (500 LOC) | ~8K |
| Which tabs are real vs mock? | Docs contradictory (Insights doc describes nonexistent files) | 4 screens + docs cross-check | ~15K |
| Where does match data come from? | Partial | api.ts + backend + .env.example | ~8K |
| What was the Insights plan? | Doc exists but describes unbuilt architecture as shipped | PRD + status doc + code refutation | ~12K |
| Is Firebase used? | **Docs lie** (tech_stack says active; zero code refs) | tech_stack_decisions.md + grep sweep | ~10K |

### art_is_everywear
| Q | | | |
|---|---|---|---|
| How do customers order? | **README lies** (describes removed checkout; reality: made-to-order) | README + order flow source + origin/main log | ~15K |
| How is admin gated? | No doc | admin-actions + AdminGate + rules | ~10K |
| What do the 4 Firebase workflows do? | No doc | 4 workflow files + scripts | ~8K |
| Where does order data live / how backed up? | **No doc, no runbook** | rules + firestore usage + console | ~10K |
| Demo mode vs prod? | No doc | env handling + client.ts + Vercel config | ~8K |

### qari-assets
| Q | | | |
|---|---|---|---|
| What are the 5 variants + shapes? | Partial (README brief; schema only in Python source) | README + `_build_manifest.py` | ~6K |
| How does a release cut? | Self-documented (workflow comments) | auto-release.yml | ~2K |

**Aggregate baseline: ~24 questions, ~250K tokens of file-opens, 8 questions where existing docs are actively wrong, 1 question unanswerable at any price until the Phase-0 rescue.**

Phase-5 target: every question ≤2 file-opens inside `project-os/`, zero source-tree greps, zero lying docs (superseded ones carry `superseded_by:`).
