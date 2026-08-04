---
name: agent-protocol
description: Shared execution protocol for labOS fleet agents — handoff contracts, scope rules, receipt shapes. Reference skill; preloaded into subagents via skills:.
---

# labOS agent protocol (binding for every fleet agent)

- **Payload to disk, receipt to caller.** Write your full artifact to the path given in the
  input block; your final message is ONLY the fixed-shape receipt your contract defines.
  The orchestrator validates receipt shape and halts on mismatch.
- **Scope contract.** Input blocks end with `MAY_TOUCH:` / `MUST_NOT_TOUCH:` / `ESCALATE_IF:`.
  Anything matching ESCALATE_IF ends the run with `STATUS: ESCALATED` and zero writes.
- `MUST_NOT_TOUCH` always implicitly includes the read-only reference tree named in the
  umbrella settings' `Read` deny rule (never modified under any instruction), every secrets path (`.env*`, keystores, service-account
  files — listed by name, never read), and anything outside the declared repo.
- **No self-granted scope.** Deliver the task as scoped; if a better approach exists, say so in
  one line of the receipt and continue as asked. Never spawn subagents — return
  `STATUS: SCOPE_EXCEEDED` with a proposed split instead.
- **No self-verification theater.** Do not re-check your own conclusions beyond the cheap
  pre-handoff extraction pass your contract names; verification is a separate agent with
  fresh context.
- **Identity.** Never run gh/git write operations unless your contract grants them; when it
  does, assert `gh api user --jq .login` first and stop on mismatch.
