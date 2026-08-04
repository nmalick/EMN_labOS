---
title: Rebuilding a trustworthy documentation baseline
type: reference
project: labos
status: REFERENCE
owner: Malick
created: 2026-08-02
updated: 2026-08-02
last_verified: 2026-08-02
verified_against: n/a (external references)
ttl_days: 365
confidence: confirmed
---

# Rebuilding a trustworthy documentation baseline

For repos that work but were never documented: the code exists, the rationale is gone, and nobody
— human or agent — can answer "why is it like this" without re-deriving it. The goal is not
*documentation*; it is **documentation you can act on without re-checking**. A doc you must verify
before trusting is worse than no doc: it costs the same read plus the verification.

## 1. The core problem

An agent asked to document a codebase will cite files that don't exist, name methods renamed three
refactors ago, and describe flows that were true in an earlier version. Published
retro-documentation guidance is blunt: verify that cited files exist, that method names are correct,
and that described flows match the code — and proceed in phases rather than accepting bulk output
([retro-documentation guide](https://albertomeleleo.medium.com/retrodocumentation-of-legacy-projects-with-ai-a-practical-guide-for-gemini-cli-claude-code-and-c009872a17fb)).
The deeper point from the grounding literature: this is an **architectural** constraint, not a
probabilistic one. A model cannot cite code it has not seen. The fix is therefore not a better
prompt or a hallucination filter, but a pipeline where an uncited claim structurally cannot reach
publication. ([cite or don't claim](https://medium.com/@pvginkel/my-ai-workflow-part-5-grounding-cite-or-dont-claim-8ee3f438ce49))

## 2. The phased workflow

Four phases with a gate between each. Don't collapse them — the value is that each phase's output
is small enough to check before the next builds on it.

**Phase 1 — Reconnaissance (read-only).** Entry points, dependency manifests, build and test
commands, directory shape, the stack as actually declared rather than as remembered. Output is an
inventory, not prose; its artifacts become the ground-truth manifest Phase 4 checks against.

**Phase 2 — Archaeology (git).** Reconstruct the evolution: when each subsystem appeared, what was
rewritten, what was abandoned. Run actual git commands rather than reading commits by hand —
`git log --diff-filter=A` for birth dates, `--follow` across renames, merge-commit inspection for
integrated work. Dedicated tooling exists when the repo warrants it:
[code-maat](https://github.com/adamtornhill/code-maat) for temporal-coupling and hotspot mining,
git-of-theseus for line provenance across renames, and
[commercial tooling](https://www.repowise.dev/blog/comparisons/best-codebase-documentation-tools-2026)
hashing files to regenerate docs incrementally
([code archaeology with git](https://jfire.io/blog/2012/03/07/code-archaeology-with-git/)).

**Phase 3 — Generation (structured, not open-ended).** The prompt shape that works has explicit
sections — context and role, analysis phases, output templates, rules and constraints — not "write
docs for this repo." Every non-trivial claim carries its citation inline as it is written.

**Phase 4 — BLIND verification.** A separate pass, by an agent that has **not** seen the generation
context, given only the doc and the repo and asked whether each cited claim holds. Blindness is the
whole mechanism: an agent that just wrote a claim reads its own citation charitably; a verifier
that never saw the reasoning has nothing to be charitable toward. Findings return as a pass/fail
list, not as edits — the writer fixes, the verifier re-checks. Gate discipline throughout:
**validate incrementally, never bulk-accept a first draft**, so a wrong Phase 1 inventory is caught
before it becomes forty pages of confident prose.

## 3. Citation must travel with the claim

Any behavioral claim — a call graph, an endpoint's side effect, a hook wiring, a default value —
carries `path/from/repo/root.ext:LINE` **in the answer itself**. Not "I looked at the file," not a
bibliography at the bottom: adjacent to the sentence it supports
([grounding](https://medium.com/@pvginkel/my-ai-workflow-part-5-grounding-cite-or-dont-claim-8ee3f438ce49)).
A grammar small enough to enforce mechanically: `path.ext:LINE` for a line;
`path.ext:LINE:symbolName` for a line plus the symbol it must contain (catches drift a bare line
number misses); `path.ext:START-END` for a range; `commit <short-sha>` or `tag <name>` for evidence
that lives in history rather than the tree.

**Manifest-based existence checking** is what makes the grammar pay. Extract every citation into a
sidecar manifest — one line per claim, `<doc>:<doc-line> -> <src>:<src-line>[:<symbol>]` — and
check it mechanically against the real repo, scoring the fraction of cited entities that actually
exist. This "existence ratio" is the same technique used to evaluate generated-doc quality in the
research literature ([DocAgent](https://arxiv.org/pdf/2504.08725)). Set tolerances deliberately:
line drift of a few lines with matching content is a non-blocking `LINE_DRIFT` finding; a missing
file or symbol is a blocking failure. Anything the writer can't cite is either cut or tagged (§5) —
those are the only two options.

## 4. Git archaeology is the evidence spine

For an under-documented repo, git history is usually the only durable evidence of intent, and the
useful signal is **structural, not prose**. Ranked by reliability:

1. **Branch names and PR/merge titles** — written to describe a unit of intent before the work was
   judged, and they survive squashing. A branch named for a subsystem rewrite is stronger evidence
   that a rewrite happened than any individual commit message.
2. **Merge topology and file-birth dates** — when a directory first appeared, what arrived with it,
   what vanished at the same time. Fact, not interpretation.
3. **Tags and release boundaries** — they date the claims and give the changelog its spine.
4. **Commit message prose — last.** Written under time pressure, frequently wrong about *why*, and
   the most tempting thing to quote.

The honest limitation: **backfilling a decision log from history is genuinely hard, and current
assistants cannot reliably reconstruct tacit knowledge on demand.** Treat everything minable —
commit text, PR description sections — as seed material a human confirms, never ground truth
([Lore: commit messages as structured knowledge](https://arxiv.org/html/2603.15566),
[git and PR workflows with AI](https://agenticskillset.org/en/topics/git-and-pr-workflows-with-ai/)).

## 5. `Inferred — needs review` is the load-bearing tag

The single most important guardrail against hallucinated decision history: anything **reasoned**
rather than **observed** is tagged `Inferred — needs review` at the point of the claim, and a human
clears the tag before it counts as fact
([doc-init pattern](https://eriklieben.com/posts/agentic-dev-workflow-documentation/)).
Make it structural, not advisory. **1:1 with the manifest** — every `INFERRED` manifest line
corresponds to exactly one in-doc tag and vice versa; untagged uncited claims are a pipeline bug,
not a style issue. **Promotion gate** — a doc with any unresolved marker cannot reach `READY`
status, which is what stops the tag decaying into decoration: it has a consequence, so it gets
cleared. **Backfill selectively** — when reconstructing decision records for existing code, only
backfill decisions still load-bearing *and* observable in the structure or the diff. A speculative
record about a decision nobody can verify is worse than a gap, because a gap is honest.

## 6. Freshness as a contract, not a habit

Docs rot silently. The fix is a machine-checkable frontmatter contract plus a deterministic gate —
no model in the loop, so it can't be talked out of a finding.

```
last_verified: YYYY-MM-DD    # when claims were checked against code — NOT "updated"
verified_against: <sha>      # the commit they were checked against
ttl_days: 90                 # 180 for architecture docs, 365 for stable references
sources: a.py:12, b.ts:40    # the citations the gate resolves
confidence: confirmed | inferred | unknown
status: DRAFT|IN_PROGRESS|READY|COMPLETE|ARCHIVED|SUPERSEDED|REFERENCE
```

`last_verified` and `updated` being separate fields is the point: reformatting a doc updates it
without re-verifying anything, and conflating the two makes every cosmetic edit look like a
freshness renewal. The gate then fails on exactly three conditions — **TTL expiry**
(`last_verified + ttl_days` in the past), **citation rot** (a `sources` entry no longer resolves),
and **stale base** (`verified_against` is not an ancestor of the main branch, i.e. the code moved
since verification). Richer variants exist: a composite score combining age, symbol drift, and TTL
penalty, with mid-range scores routed to a model judge returning
`STILL_ACCURATE / DRIFTED / NEEDS_HUMAN_REVIEW`, plus a per-PR freshness comment, a badge, and a CI
gate with a documented bypass
([freshness scoring in CI](https://dosu.dev/blog/score-documentation-freshness-in-ci)). Start with
the three deterministic checks; add the judge only if the gray zone is actually costing you.

## 7. ADR, changelog, and event log are complementary

Three artifacts, three readers, three questions. Running all three isn't redundancy; collapsing them
into one is the mistake.

| Artifact | Question | Reader | Discipline |
|---|---|---|---|
| **ADR** (Nygard/MADR) | Why is it built this way? | Whoever inherits the code, incl. future you | One file per decision: context, decision, alternatives *with why-rejected*, consequences incl. negative ones. Numbered, immutable — superseded, never edited. |
| **Changelog** (Keep a Changelog 2.0.0) | What changed for a user? | Users | Reverse-chronological by release, six fixed categories, `Unreleased` + `[YANKED]`. |
| **Event log** | What happened, in order, including what we abandoned? | The operator resuming after weeks away | Timestamped entries typed `SHIPPED · DECISION · REFACTOR · PIVOT · DROPPED · EXPERIMENT · FIX`, each carrying its evidence. |

- **Solo, the event log is the highest-value of the three.** Teams get decision context free through
  discussion; alone it evaporates the moment a session's context clears. A native decision-log
  feature was proposed and closed "not planned"
  ([issue 15222](https://github.com/anthropics/claude-code/issues/15222)) — build it as a file plus
  a session-close ritual.
- **It must have an "unfinished / dropped" section.** Directions seriously considered and abandoned
  are the most expensive knowledge to lose and the least likely to be recorded anywhere else. Make
  a `DROPPED` entry a *precondition* for deleting a branch, recording the recovery command
  (`git checkout archive/<name>`) in the entry.
- **Changelogs resist machine authorship on purpose.** Keep a Changelog 2.0.0 treats AI-generated
  entries as raw material at best — a commit and a changelog entry are written for different
  readers, and a person still decides what is notable
  ([keepachangelog 2.0.0](https://keepachangelog.com/en/2.0.0/)).
- **Where an ADR lives matters more than which template**: in the repo, versioned, one file per
  decision. ([adr.github.io](https://adr.github.io/), [Fowler](https://www.martinfowler.com/bliki/ArchitectureDecisionRecord.html))

## 8. Honest negative assertions

An under-documented repo generates as many "does this exist?" questions as "how does this work?"
ones, and an unanswered one costs a full search every time it recurs. So state absences, with the
same evidence standard as presences — *"No telemetry in this project: confirmed absent from the
dependency manifest and the app entry point (verified `<sha>`, `<date>`)."* **Name what you
checked**, not just the conclusion: "no X" is unfalsifiable, "absent from `<manifest>`" is
checkable. **Date and pin it**, since absence is the claim most likely to silently become false.
**Never assert absence from a failed grep alone** — a grep proves a string isn't there, not that
the capability isn't; say which manifest, entry point, or config you read.

## 9. The maintenance loop

Baselines decay the week after they're built unless refresh is cheap and bounded.

- **Cursor-headed architecture docs.** Each carries a header naming the last commit it was checked
  against, plus a maintenance log. Refresh reads the cursor, lists commits since, triages which
  touch documented areas, and **re-audits only the affected sections** — converting refresh from
  "re-read the repo" into a bounded diff review, the difference between a job that gets done and
  one that doesn't. It also makes the doc, not the code, the answer to questions it covers, which
  is the point of building it.
- **Reviewable PR, never an autonomous commit.** Non-negotiable. Constrain automated doc refresh to
  opening a pull request on a predictable branch; an agent that can silently rewrite the baseline
  can silently un-verify it. Pair the writer with a separate verifier rather than trusting
  single-agent self-review, and use a pre-completion checklist forcing re-verification against the
  code before the task is called done
  ([continuous documentation](https://www.agentpatterns.ai/workflows/continuous-documentation/),
  [code-diff-to-docs-PR](https://developers.redhat.com/articles/2026/04/21/ai-powered-documentation-updates-code-diff-docs-pr-one-comment)).
- **Two trigger shapes** — cron (scheduled audit, catches TTL expiry and drift) and push-on-path
  (narrow, immediate, only docs whose `sources` overlap the changed paths). Run both; they catch
  different failures.
- **Session-close gap detection.** A stop hook or wrap-up command that reviews the finished session
  and raises a non-blocking reminder when a significant change merged without a decision record, or
  an operational script shipped without a runbook — while the gap is fresh, not at the next audit
  ([wrap-up ritual](https://eriklieben.com/posts/agentic-dev-workflow-documentation/),
  [stop-hook pattern](https://code.claude.com/docs/en/large-codebases)).
- **Docs as code** — commit generated docs, review changes like code, and test embedded snippets so
  broken examples fail CI rather than misleading a reader.

## 10. Sequence for a cold repo

Recon inventory → git-archaeology timeline → architecture doc with inline citations and a commit
cursor → blind verification, fix, re-verify → backfill only load-bearing decision records, all
tagged `Inferred — needs review` → seed the event log from the timeline, with an explicit
dropped/unfinished section → add frontmatter contracts and wire the deterministic freshness gate →
schedule the bounded refresh. The first four steps produce the baseline; the rest keep it one.
