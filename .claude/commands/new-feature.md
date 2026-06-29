> **Invoke:** `/new-feature [feature name]`
> 

> **Purpose:** Full pipeline orchestrator — runs every agent in sequence, PM fires at milestones
>
---
description: Full pipeline from pre-sprint gate to shipped feature.
  Requires a completed pre-sprint doc in docs/pre-sprint/.
  Project manager fires at milestones — creates GitHub issues and
  sends optional milestone notifications.
argument-hint: "<feature name>"
---

## RULE
Invoke @agent-project-manager at MILESTONES ONLY (marked with 📌 below).
PM creates GitHub issues for new docs and sends a notification via the configured channel (if any).

---

## Step 0 — Pre-sprint gate check
Check docs/pre-sprint/ for a file matching "$ARGUMENTS" from today or yesterday.
If none exists: STOP. Output:
  "No pre-sprint doc found for '$ARGUMENTS'.
   Run /pre-sprint first, then come back."
If found: read the summary and pass it as context to @agent-pm in Step 3.

## Step 1 — Validate (parallel)
Invoke @agent-concept-validator AND @agent-tech-feasibility simultaneously.
Pass the pre-sprint summary as input to both.
Wait for both to complete.
📌 invoke @agent-project-manager — milestone: POST-VALIDATION

## Step 2 — Council #1 (approach vote)
Invoke @agent-council with:
- The pre-sprint summary
- The validation outputs from Step 1
- 2-3 proposed implementation approaches
Wait for APPROACH_APPROVED or DEADLOCKED verdict.
If DEADLOCKED: pause and ask user for decision. Resume after input.

## Step 3 — Spec
Invoke @agent-pm with the feature description AND:
- The pre-sprint summary
- The Council's approved approach

**[PENDING] protocol**: PM drafts with `[PENDING: describe what needs verification]` markers
on any unverified claim. Spec CANNOT advance to READY_FOR_DESIGN until all [PENDING] markers
are resolved (verified with a source, rewritten, or explicitly acknowledged as uncertain).

**Outcome orientation gate**: Before advancing, verify all of the following are in the spec:
- [ ] Success metric defined (what will we measure?)
- [ ] Baseline established (current state of that metric)
- [ ] Target set with timeframe (what success looks like and when)
- [ ] Measurement plan (how and when we'll measure)
- [ ] Dashboard or reporting plan (where results will be visible)

If any are missing: flag them as gaps. Do not mark READY_FOR_DESIGN until resolved.

Wait for spec status = READY_FOR_DESIGN (with all [PENDING] resolved and outcome gate complete) before proceeding.

## Step 4 — Design panel (sequential)
4a. @agent-user-researcher — wait for READY_FOR_IA
4b. @agent-info-architect — wait for READY_FOR_INTERACTION
4c. @agent-interaction-designer — wait for READY_FOR_FIGMA
4d. @agent-mock-prompter — wait for READY_FOR_SYNTHESIS
4e. @agent-brand-designer — wait for brand review complete
4f. @agent-designer (synthesis) — wait for READY_FOR_FRONTEND
📌 invoke @agent-project-manager — milestone: POST-DESIGN

## Step 5 — Architecture (parallel with design)
Invoke @agent-backend-eng immediately after Step 3 completes.
Does not need to wait for design panel — runs in parallel.

## Step 6 — Council #2 (design + arch vote)
Invoke @agent-council with:
- docs/design/*-design-final.md
- docs/architecture/*-adr.md and *-api.md
Wait for APPROVED. If REVISE: return artifacts to relevant agents.

## Step 7 — Sprint plan
Invoke @agent-sprint-planner with the approved spec and design.

## Step 8 — Build loop
For each chunk in the sprint plan (from docs/sprints/*-sprint-plan.md):
  a. Invoke @agent-frontend-eng: "Build chunk [N]: [chunk name]"
  b. Invoke @agent-iteration-reviewer: "Review chunk [N]"
  c. If iteration-reviewer returns BLOCKED: stop loop, surface blocker.
  d. If SAFE TO START: continue to next chunk.
Repeat until all chunks are COMPLETE.
📌 invoke @agent-project-manager — milestone: POST-BUILD

## Step 9 — QA gate
Invoke @agent-qa: "Full QA for [feature name]"
If score >= 75: proceed to Step 10.
If score < 75:
  - Read REVISION INSTRUCTIONS in QA report
  - Return to the failing agent with specific fix instructions
  - Re-run that agent
  - Re-run @agent-qa
  - Loop until score >= 75
📌 invoke @agent-project-manager — milestone: POST-QA

## Step 10 — Council #3 (ship vote)
Invoke @agent-council with:
- The QA report (docs/qa/*-qa-report.md)
- The final design doc
- The implementation summary from frontend-eng
Wait for SHIP_APPROVED. If REVISE: surface specific items.

## Step 11 — Ship
Run /ship-check $ARGUMENTS
📌 invoke @agent-project-manager — milestone: SHIPPED
