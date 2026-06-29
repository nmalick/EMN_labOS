> **Invoke:** `/backlog`
> 

> **Purpose:** Retrieve master backlog across all projects
>

---
description: Retrieve the master backlog across all active projects.
  Sends a formatted summary via the configured notification channel (if any).
  Can also be used to add a task.
argument-hint: "[optional: add: <task description> for <project> P<0-2>]"
---

## Mode detection
If $ARGUMENTS starts with "add:": run ADD MODE.
Otherwise: run RETRIEVE MODE.

---

## RETRIEVE MODE (default)

Invoke @agent-project-manager with trigger: "show backlog"

The project manager will:
1. Read docs/backlog/master-backlog.md
2. Read each active project's backlog
3. Format the combined backlog:

*MASTER BACKLOG — [Date]*

*[PROJECT A]*

P0 🔴 [feature] — [status] — [next action]

P1 🟡 [feature] — [status] — [next action]

P2 ⚪ [feature] — [status]

*[PROJECT B]*

P0 🔴 [feature] — [status] — [next action]

...

*[N] items total · [X] blocked · [Y] in progress*

4. Send formatted backlog via the configured notification channel (if any)

---

## ADD MODE (when $ARGUMENTS starts with "add:")

Parse: "add: [task description] for [project] P[priority]"

Invoke @agent-project-manager with trigger:
"add to backlog: [task] for [project] P[priority]"

The project manager will:
1. Append to docs/backlog/master-backlog.md
2. Send confirmation via the configured channel (if any): "✅ Added: [task] to [project] P[N] backlog"
