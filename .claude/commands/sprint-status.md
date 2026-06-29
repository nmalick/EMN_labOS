> **Invoke:** `/sprint-status`
> 

> **Purpose:** Get a full sprint board for the current project
>
---
description: Triggers the project manager to scan all docs/ outputs and
  produce a sprint board. Sends summary via the configured notification channel (if any).
---

Invoke @agent-project-manager with trigger: "status"

The project manager will:
1. Read all files in docs/ for the current project
2. Build a sprint board:
   - DONE: artifacts with final approved statuses
   - IN PROGRESS: agents actively working (DRAFT status)
   - BLOCKED: anything with BLOCKED status or missing prerequisites
   - BACKLOG: features not yet started
3. Write the board to docs/status/sprint-board.md
4. Send summary via the configured notification channel (if any) with link to any open GitHub issues
5. Surface the single most important blocked item with its specific question
