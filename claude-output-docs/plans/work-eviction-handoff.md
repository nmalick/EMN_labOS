---
title: Global-config work-eviction hand-off (pointer)
type: plan
status: READY
owner: Malick
created: 2026-08-02
updated: 2026-08-02
---

# Work-eviction hand-off — pointer stub

The machine-global Claude config still carries items that belong to the other (work) context:
four live scheduled tasks, one plugin enablement, and a plan-file sweep. Evicting them requires
verification from a work session, so this rebuild documented the work instead of doing it.

**The detailed plan lives OUTSIDE this repo** (it names work systems; this repo is public):

```
~/YaqeenProjects/JourneyOS/.claude-work/plans/global-work-eviction.md
```

Trigger: next work session with infra time. Debt-register row: rebuild tracker `D-3`.
If that file is ever lost (gitignored path), regenerate it from the run archive:
`~/Archive/labos-rebuild-2026-08/reports/`.
