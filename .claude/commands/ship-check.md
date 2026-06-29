> **Invoke:** `/ship-check [feature name]`
> 

> **Purpose:** Run QA numeric scoring + Council ship vote before merging to main
>
---
description: Run QA and Council ship vote on a named feature before merging.
  QA score must be >= 75/100. Council must return SHIP_APPROVED (3/4 majority).
  Used as the final gate before any feature is merged to main.
argument-hint: "<feature name to QA and ship-review>"
---

## Step 1 — QA gate
Invoke @agent-qa with: "Full QA for $ARGUMENTS"

Review scope:
1. The spec in docs/specs/ for feature: $ARGUMENTS
2. The design doc in docs/design/ for the same feature
3. The implementation in src/ — run linter and tests, report failures

If score >= 75: proceed to Step 2.
If score < 75:
  Output the QA report with REVISION INSTRUCTIONS.
  Stop here. Do not proceed to Council.
  Tell user: "QA score is [X]/100. Address the revision instructions
  and re-run /ship-check when ready."

## Step 2 — Council ship vote
Invoke @agent-council (MODE 2 — post-task validation) with:
- The QA report: docs/qa/[latest for $ARGUMENTS]
- The design final doc: docs/design/[latest for $ARGUMENTS]
- A summary of what was built by @agent-frontend-eng

Wait for SHIP_APPROVED or REVISE verdict.

If SHIP_APPROVED:
  Output: "✅ $ARGUMENTS is cleared to ship.
  QA: [score]/100 · Council: SHIP_APPROVED ([X]/4 votes)"

  **Post-ship learn step** — generate the following before closing out:

  1. **CHANGELOG entry** (for calendar/CHANGELOG.md if in a project repo):
  ```
  ### [today's date] — [feature name]
  **Products affected**: [list]
  **Type**: Feature launch
  **Metric effects**: [expected direction and magnitude]
  **Watch window**: 7 days
  **Notes**: [anything that could affect metric interpretation]
  ```

  2. **7-day watch list**:
  - Metrics to monitor (primary metric + guardrails)
  - Anomaly thresholds: what change would trigger investigation
  - Instrumentation check: new events to verify are firing correctly

  3. **Baseline reset notes**:
  - Does this feature change how any existing metric should be interpreted?
  - Do before/after comparisons need to account for the feature's existence?

If REVISE:
  Output the specific revision items from each sage.
  Stop here. Tell user what needs to change before re-running.

If HUMAN_REQUIRED (2-2 tie):
  Present the tie-breaking question clearly.
  Wait for user input before proceeding.

📌 invoke @agent-project-manager with final ship verdict
