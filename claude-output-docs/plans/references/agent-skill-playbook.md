---
title: Agent & Skill Playbook — Model Tiering, Roster Design, and Verification Architecture
type: reference
project: labos
status: REFERENCE
owner: Malick
created: 2026-08-02
updated: 2026-08-02
last_verified: 2026-08-02
verified_against: n/a (external references)
ttl_days: 365
sources:
confidence: confirmed
superseded_by:
related:
---

# Agent & Skill Playbook

A reference for designing Claude Code agent rosters: which model tier to put a task on, how to
write agent and skill frontmatter so the tiering actually holds, how to structure verification so
a checker's answer means something, and a worked example of a small roster built on these rules.
This is a design reference, not a how-to for any one project — the roster shape at the end is
illustrative, not prescriptive.

## 1. Model tiering for agent teams

**The dominant production shape is hierarchical, not flat.** A high-capability planner decomposes
a task and routes it; lower-tier workers execute bounded subtasks; a separate evaluator scores the
result against criteria and the planner iterates. Reported savings from tiering this way run
40–60% versus running every hop on the top-tier model, and routing cheap-model *generation* through
a capable-model *check* is called out specifically as a quality win, not just a cost one — the
inversion works because verification and generation are different tasks with different difficulty
profiles. ([beam.ai — Multi-Agent Orchestration Patterns for Production](https://beam.ai/agentic-insights/multi-agent-orchestration-patterns-production), [Augment Code — Multi-Agent Orchestration Platforms](https://www.augmentcode.com/tools/multi-agent-orchestration-platforms-build-vs-buy))

**The caveat that matters for small teams:** multi-agent decomposition buys on the order of ~2
points of accuracy at roughly double the cost. Orchestration overhead is worth paying for offline,
quality-sensitive work — documentation that becomes a source of truth, code changes with thin test
coverage — and is not worth paying for high-volume or latency-sensitive work. Fan out only where a
task genuinely fans out; a roster is a cost center before it's a capability, and every added agent
should own something a single context window provably can't. ([beam.ai](https://beam.ai/agentic-insights/multi-agent-orchestration-patterns-production))

**Self-verification is the load-bearing finding.** A model that generates and then checks its own
output in the same context window scores verification accuracy roughly equal to its generation
accuracy — the same representational bias that produced an error is present when the model
re-reads its own work. Independence has to come from *fresh context and information asymmetry*,
not from a "now double-check yourself" instruction in the same prompt. The strong form: a checker
that re-derives claims from source material while blinded to the generator's reasoning breaks the
symmetry and pushes verification accuracy above generation accuracy. This is the argument for why
the maker should never grade the checker's homework, or vice versa. ([MindStudio — The Verifier Pattern](https://www.mindstudio.ai/blog/verifier-pattern-multi-agent-systems-independent-review), [Augment Code — Adversarial Code Review: Why the Maker Shouldn't Grade the Checker](https://www.augmentcode.com/guides/adversarial-code-review), [ReVeal: Self-Evolving Code Agents via Reliable Self-Verification, arXiv:2506.11442](https://arxiv.org/pdf/2506.11442))

**A practical tiering rule that follows from both findings:**

| Tier | Use it for | Why |
|---|---|---|
| Orchestrator (flagship / highest capability) | Planning, decomposition, routing, halting on ambiguity, final validation — never bulk execution | A wrong routing decision compounds through every downstream agent |
| Heavy executor | Any step where a wrong answer is expensive or long-lived: authoring a doc that becomes a reference, editing code with little test coverage, a ship/no-ship call | Judgment quality dominates; cost is secondary |
| Mid executor | Long, broad, tool-heavy work whose output a human reads before acting on — research, synthesis, drafting | A human gate sits between the output and any consequence, which is exactly the condition under which a mid-tier model is the right call |
| Light executor | Decidable work — the answer is checkable by a shell command, so model judgment isn't actually the bottleneck: bounded search, inventory, existence/format checks, running a command and reporting output | Running judgment-tier models on decidable tasks is pure waste; a light model gets equivalent results at a fraction of the cost |

**Handoffs should be structured, not raw transcript.** The handing-off agent synthesizes a package —
goal, completed steps, findings, open questions, constraints — plus an explicit scope contract
stating what the receiver may do independently versus must escalate. The orchestrator validates
every returned package against an expected shape and halts on mismatch rather than letting the
next agent infer intent from a malformed handoff. Writing the full artifact to disk and returning
only a short receipt is the more durable form of this pattern — it survives context compaction and
keeps the orchestrator's own window small. ([MindStudio — Agent Handoff Pattern](https://www.mindstudio.ai/blog/what-is-agent-handoff-pattern), [digitalapplied — Multi-Agent Orchestration Playbook](https://www.digitalapplied.com/blog/multi-agent-orchestration-playbook-agency-workflows))

## 2. Agent-authoring rules for Claude Code

These are Claude Code subagent-frontmatter mechanics, verified against the official docs rather
than memory, because several of them are non-obvious and each one silently breaks a tiering design
if missed.

- **Set `model:` explicitly on every agent.** The field accepts `sonnet`, `opus`, `haiku`, `fable`,
  a full model ID, or `inherit` — and it *defaults to `inherit`* when omitted. An agent file
  without a `model:` line silently runs on whatever the parent session's model is, which quietly
  promotes every light-tier agent to the session's tier the first time someone starts a session on
  a higher model. This is the single most common way a tiering design fails in practice, because
  the failure is invisible until you check.
- **`CLAUDE_CODE_SUBAGENT_MODEL` overrides everything.** Claude Code resolves an agent's model in
  this order: the `CLAUDE_CODE_SUBAGENT_MODEL` environment variable, then a per-invocation `model`
  parameter, then the agent's own frontmatter, then the parent session's model. If that variable is
  set anywhere in the environment, the entire frontmatter tiering table is inert — every agent runs
  on one model regardless of what its file says. Leave it unset, and check it first if a roster
  behaves as if tiering isn't happening.
- **`disallowedTools` is applied before `tools`.** When both are set, `disallowedTools` is applied
  first and then `tools` is resolved against whatever remains; a tool named in both is removed
  either way. Read-only enforcement for an agent belongs in `disallowedTools` (or a narrow `tools`
  allowlist), not in a skill.
- **A skill's `allowed-tools` does not restrict — it only pre-approves.** It grants permission for
  the listed tools during the turn that invokes the skill so Claude doesn't have to ask; it does
  not remove any other tool from the available pool, and the grant clears on the next message. A
  skill cannot be made read-only through `allowed-tools`. Use the skill's own `disallowed-tools`
  field for that, and put the durable, cross-turn version of the restriction on the agent's `tools`
  / `disallowedTools`.
- **`skills:` on an agent injects full skill content, not just its description**, at startup. This
  is the cheap channel for giving several agents a shared, machine-checkable spec — a format
  grammar, a scope-contract convention — once, instead of restating it in every agent's prompt.
  It cannot preload a skill that sets `disable-model-invocation: true`, because preloading draws
  from the same pool of skills the model is allowed to invoke on its own.
- **`isolation: worktree` is purpose-built for edit-heavy executors.** It runs the agent's commands
  inside a temporary git worktree branched from the default branch, giving it an isolated copy of
  the repository; the worktree is cleaned up automatically if the agent makes no changes. This
  contains the blast radius of an executor that edits files without a human watching each edit.
- **`memory:` scoping is a real decision, not a default.** The field accepts `user`, `project`, or
  `local` and gives an agent a persistent directory that survives across sessions. `user`-scoped
  memory follows the agent across every project on the machine — appropriate for genuinely
  cross-project knowledge, and a liability for anything else, since it accumulates and eventually
  orphans once a roster is redesigned and nobody remembers to clean up the old scope.
- **`effort:` is a real lever, not decoration.** Light agents doing decidable work should run at low
  effort; heavy executors doing judgment work should run high. Reserve the highest effort settings
  for a specific hard task, not as a blanket default — they cost more and most tasks don't need
  them.
- **No self-granted scope, and no self-instructed verification, on the most capable models.**
  Current-generation flagship models tend to expand task scope unless told not to, and tend to
  verify their own work whether or not they're asked — which means an explicit "double-check your
  work" instruction on a heavy executor adds cost without adding accuracy, and should be deleted
  rather than rephrased. Verification belongs in a separate agent with its own context, never a
  self-check inside the writer's prompt (see §4).
- **Executors should not spawn executors.** If an orchestrator is the only fan-out point, cost and
  provenance stay auditable; give heavy executors an explicit instruction not to spawn subagents,
  and to return a "scope exceeded, here's a proposed split" status instead.

Sources: [Claude Code — Create custom subagents](https://code.claude.com/docs/en/sub-agents), [Claude Code — Extend Claude with skills](https://code.claude.com/docs/en/skills).

## 3. Skill-authoring rules

- **Prefer skills over legacy slash commands for new work.** Custom commands have been merged into
  skills — a command file and a `SKILL.md` both produce the same `/name` invocation, and old
  command files keep working — but skills add invocation control, supporting files, and dynamic
  context injection that plain commands don't have. A skill's body also costs close to nothing
  until it's actually invoked, versus standing content in a CLAUDE.md file that loads on every
  turn regardless of relevance. ([Claude Code — Extend Claude with skills](https://code.claude.com/docs/en/skills), [Claude Code — Best practices](https://code.claude.com/docs/en/best-practices))
- **`disable-model-invocation: true` for anything side-effecting.** It stops the model from
  triggering the skill on its own — appropriate for anything that writes, deploys, sends a
  message, or otherwise takes an action the model shouldn't decide to take because "it looks
  ready." The skill still runs when a person invokes it directly.
- **Shared *reference* skills must not set that flag.** A reference skill — a format spec, a
  shared contract several agents need to read identically — has to stay model-invocable, because
  `disable-model-invocation: true` also blocks it from being preloaded into a subagent's context
  via that agent's `skills:` field. Setting the flag on a spec skill silently breaks every agent
  that was supposed to preload it; the two use cases (a workflow you trigger by hand, and a spec
  other agents preload) need opposite settings.
- **Adopt a HALT convention with a per-halt bypass flag.** A halt that always requires human input
  regardless of any automation flag versus a halt that an explicit `--auto`-style flag may skip is
  a distinction worth making structural rather than ad hoc, because it's what makes the same skill
  usable both interactively and as a scheduled or unattended run: interactive runs stop at every
  halt, unattended runs skip only the ones explicitly marked skippable, and the irreversible ones
  never skip regardless of flags.
- **Payload to disk, receipt to caller.** An executor writes its full output to a path the caller
  specifies and returns a short, fixed-shape status — not the artifact itself. This keeps the
  orchestrating session's context small regardless of how large any single agent's output gets, and
  it means a crash or context-compaction event doesn't lose the work, only the in-flight summary of
  it.
- **Every handoff carries a scope contract.** State explicitly what an executor may touch, what it
  must never touch, and what conditions end the run early rather than being silently worked around.
  A three-part shape — may-touch, must-not-touch, escalate-if — is enough to make an executor's
  authority checkable after the fact instead of inferred from what it happened to do.

## 4. Verification architecture

The core idea from §1 made concrete: **a checker only means something if it doesn't share the
generator's blind spots.** Two mechanisms produce that independence, and a third layer decides
when neither is enough.

**Blind citation / claim verification.** The writer emits every non-trivial claim as an
extractable pair — a claim, and where in the source material it's grounded. A separate, light-tier
agent is then given the extracted claim list and the source material, but explicitly *not* the
writer's reasoning or rationale for why a given citation was chosen. It re-derives each claim from
source independently and reports mismatches. Denying it write access matters as much as denying it
the rationale — a checker that can "helpfully fix" a miss stops being a checker. This is the
information-asymmetry mechanism from §1 applied at the level of individual claims rather than
whole documents.

**Deterministic cross-checks catch a different failure class: silent truncation.** A verifier
reporting "all checked claims pass" is meaningless if the checked-claims count is smaller than the
writer's claimed total — that's a truncated handoff, not a clean pass. The fix is a reconciliation
check the orchestrator runs on the receipts themselves, not on the content: does the verifier's
claims-checked count equal the writer's claimed-count; does a backlog's applied-plus-reverted-plus-
skipped count equal its total item count; does a feature count reported by one agent match the
count reported by another agent working from the same source. None of this requires re-reading any
content — it's arithmetic on receipts, which is exactly why it belongs in the orchestrator rather
than in either the writer or the checker.

**Escalation triggers, decided once and applied everywhere:**

1. Any agent returns an explicit escalated/blocked status.
2. Any irreversible or destructive operation (deleting a branch, force-pushing, permanently
   removing data).
3. Anything that would change a live, production, or client-facing system's behavior.
4. Any finding that could expose identifying, sensitive, or credential material.
5. A verifier failure that survives two re-task rounds — a third round means the *approach* is
   wrong, not the output, and that's a decision for a human, not another retry.
6. Any cross-agent numeric disagreement the orchestrator cannot reconcile from the receipts alone.

A useful three-way division of labor: a light-tier verifier checks what's *decidable* (does the
cited thing exist, is the count right, is the format valid); a heavy-tier reviewer judges the
*artifact* (does this diff actually do what it claims, does this citation's existence also mean it
*supports* the claim — existence and support are different questions); the orchestrator validates
the *process* — that every required gate ran, that independent checks agree with each other. The
orchestrator should not re-derive an executor's conclusion by redoing its work in its own context —
doing so reintroduces the exact self-verification symmetry the separate checker exists to avoid.

## 5. Worked example: a lean six-agent roster

A roster sized for a single operator, not a team — six agents, each earning its slot by owning
either a distinct context boundary that would otherwise blow up a single session, or an
independence requirement that can't be satisfied inside another agent's window. Every agent's
`model:` follows directly from §1's tiering rule.

| Agent | Tier | Role | Tier rationale |
|---|---|---|---|
| Recon | Light | Bounded inventory and history digging — what exists, what the build commands are, what changed recently. Produces a facts-only brief; no interpretation. | Every output is a decidable fact (does this path exist, what does the log say). Running judgment-tier models on this is the canonical waste case from §1. |
| Auditor | Heavy | Authors one documentation surface from the recon brief plus direct source reading; every non-trivial claim carries a citation; unverified content is tagged as inferred. | The artifact becomes a long-lived source of truth on material that may have thin or no test coverage. A wrong claim here is expensive and durable — exactly the "reserve the capable model" case. |
| Fixer | Heavy, isolated worktree | Applies pre-approved, build-gated changes one at a time: verify baseline, apply one change, re-verify, commit or revert, repeat. Never batches, never reorders. | Editing code with a thin safety net is where a wrong answer is silent and lands in the repository. Worktree isolation contains the blast radius of a run that goes wrong. |
| Verifier | Light | Blind mechanical check of the auditor's citations against source — existence, not interpretation — plus format and staleness checks. Never writes; only reports. | This is the checker from §4: cheap, decidable, and run constantly. Built on a heavy-tier model, it gets used once and then quietly skipped because of cost; built light, it can run on every artifact, every cycle, forever — which is the actual requirement for a verifier. |
| Reviewer | Heavy | Judgment pass over a finished change plus its gate evidence: is the change what it claims to be, does the cited evidence actually belong to this change, does the cited material actually *support* the claim (not just exist). Produces a ship / no-ship verdict. | Everything left after the mechanical gates is judgment. Bad calls here ship. This is the reviewer role from §4 — distinct from the verifier specifically because existence and support are different questions requiring different capability. |
| Researcher | Mid | Broad, tool-heavy research — web and repo — with a mandatory prior-research check first, and explicit confidence labeling on every finding. | Long and broad, but a human reads the output before acting on it. That human gate is precisely the condition under which a mid-tier model is the correct, not merely cheaper, choice. |

**What stays outside the roster on purpose.** Anything genuinely deterministic — a sync script, a
manifest regeneration, a validation pass with a fixed pass/fail rule — runs as a plain script step,
not an agent. Wrapping a solved, deterministic problem in an agent only adds nondeterminism to it.
Destructive operations (branch deletion, force-push) stay in the orchestrating session itself,
behind a halt, and are never delegated to an agent — no executor is ever given delete authority.

**Cost shape.** Under this split, the most expensive tier is spent on exactly three roles —
authoring, fixing, and reviewing — and each is gated by a light-tier check that runs first and can
fail the work back before the expensive tier is spent a second time. The two highest-frequency
operations, both in an initial build-out and in ongoing maintenance afterward, are recon and
verification — and both run at the cheapest tier. That's where the 40–60% tiering saving from §1 is
actually realized, without downgrading a single judgment call.
