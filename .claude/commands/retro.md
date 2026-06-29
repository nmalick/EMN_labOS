> **Invoke:** `/retro`
> 

> **Purpose:** Weekly retrospective — velocity, quality trends, recommendations
>
---
description: Weekly retrospective across all active projects. Scans the
  last 7 days of docs/ activity and produces a velocity and quality
  trend summary. Run every Friday.
---

## Mission
Reflect on the last 7 days of agent activity across all projects.
Surface patterns, blockers, quality trends, and priorities for next week.
Do not just summarize — provide a point of view on what to change.

---

## Step 1 — Gather evidence

Scan all docs/ output files modified in the last 7 days across:
- each active project directory

Collect:
- All new pre-sprint docs (features started this week)
- All new spec files + their final status
- All new design docs + their final status
- All new QA reports + their scores
- All council decisions (approved / revised / deadlocked)
- All sprint chunk completions
- All BLOCKED items and whether they were resolved
- All features that shipped vs. planned to ship

---

## Step 2 — Build the retro

Produce a retro report covering:

### Velocity
- Features started this week: [count]
- Features shipped this week: [count]
- Features still in progress: [count]
- Sprint chunks completed: [count]
- Average QA score this week: [X]/100

### What flowed (name specific things that worked well)
- [Agent or workflow that performed well — why]

### What got stuck (name specific blockers and their cause)
- [What was blocked — which agent or gate — how long — resolved?]

### Quality trend
- QA scores this week vs. last week (if data available)
- Which QA dimension scored lowest: spec / design / tests / ACs / a11y
- Which agent produced the most REVISE verdicts from Council

### Council activity
- Approaches approved: [count]
- Deadlocks requiring human input: [count]
- Most common reason for REVISE: [pattern]

### Recommendation for next week
1. [Most important thing to prioritize — specific]
2. [One process improvement based on what got stuck]
3. [One agent or prompt to refine based on quality patterns]

---

## Step 3 — Save and notify

Write retro to: docs/research/YYYY-MM-DD-weekly-retro.md

📌 invoke @agent-project-manager — milestone: RETRO
PM will create a GitHub issue with the retro and send a notification via the configured channel (if any).
