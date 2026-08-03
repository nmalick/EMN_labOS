---
title: <Project> — product story <period>
type: history
project: <slug>
status: IN_PROGRESS
owner: Malick
created: YYYY-MM-DD
updated: YYYY-MM-DD
last_verified: YYYY-MM-DD
verified_against: <sha>
ttl_days: 90
confidence: confirmed
---

# <Project> — product story (<period>)

Event types: `SHIPPED · DECISION · REFACTOR · PIVOT · DROPPED · EXPERIMENT · FIX`.
Every entry carries `**Verified**: <file:line | commit | tag>` — no metric claims from memory.

## Quick Index
| Date | Type | Entry |
|---|---|---|

## Event Log  <!-- newest first -->

### YYYY-MM-DD — TYPE — <title>
<what/why in 2-4 lines>
**Verified**: <evidence>

## Decision Log  <!-- promoted DECISION entries -->
| Date | Decision | Rationale | Outcome | Evidence |
|---|---|---|---|---|

## Experiments  <!-- what was tried, what it proved, whether it survived -->
| When | Experiment | Result | Survived? | Evidence (archive tag / commit / flag) |
|---|---|---|---|---|

## Unfinished Plans / Dropped
<!-- REQUIRED row before any branch deletion: -->
| Idea | Why abandoned | Still viable? | Recover |
|---|---|---|---|
| <idea> | <why> | Y/N/Maybe | `git checkout archive/<branch-name>` |
