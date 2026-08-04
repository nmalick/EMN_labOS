---
name: improve
description: Runs the improvement-backlog fix pass for a project — T1 fully, T2 only with a green deterministic gate, T3 never (decision list). One revertable commit per item via code-fixer. HARD HALTs on item selection and the T3 list unless the unattended flags substitute.
disable-model-invocation: true
argument-hint: "<slug> [--tier T1|T1,T2] [--items id,id|all-T1] [--max <n>] [--t3=defer-to-decisions-log]"
---

# /improve <slug>

1. Session reads `project-os/plans/improvement-backlog.md`; absent ⇒ refuse, point at
   `/baseline-audit` step 5.
2. ⛔ HARD HALT — item table (id·tier·files·change·risk). Replies: `all-T1`, id list, `cancel`.
   **Unattended: `--items all-T1` (+ explicitly named T2 ids only) substitutes.**
3. `code-fixer` (worktree, `BASE_REF` = the integration branch) runs the loop with the repo's
   VERIFY_CMD from `project-os/ops/verify.md` + any SPECIAL_DISCIPLINE rows.
4. Gates: `STATUS != BASELINE_RED` · `FINAL_VERIFY: PASS` · receipt reconciles
   (APPLIED+REVERTED+SKIPPED == selected).
5. `reviewer` on the accumulated range (evidence-integrity spot-check mandatory). Gate:
   `VERDICT != NO-SHIP`.
6. ⛔ HARD HALT — T3 list. **Unattended: `--t3=defer-to-decisions-log` substitutes.**
7. Toplevel assertion, then push + PR per `templates/ops/pr-convention.md` (never merge).

> **Past learning (2026-08):** VERIFY_CMD contracts can be false-RED by construction (volatile
> fields). If baseline is red, check `ops/verify.md` for a documented corrected form BEFORE
> concluding the repo is broken — and never "fix" a contract back to its naive form.
