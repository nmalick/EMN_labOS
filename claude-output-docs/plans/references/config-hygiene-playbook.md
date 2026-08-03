---
title: Config hygiene and multi-identity separation for a solo operator
type: reference
project: labos
status: REFERENCE
owner: Malick
created: 2026-08-02
updated: 2026-08-02
last_verified: 2026-08-02
verified_against: `n/a (external references)`
ttl_days: 365
confidence: confirmed
---

# Config hygiene and multi-identity separation

For one person running several unrelated contexts — personal projects, a client project, and a
team-scale OS operated elsewhere — from one machine and one Claude Code install. Two goals in
tension: keep every session's standing context small, and keep the contexts from bleeding.

## 1. Layer rule: what belongs where

Claude Code reads four `CLAUDE.md` scopes and **concatenates** them — it does not override.
Managed policy → user (`~/.claude/CLAUDE.md`) → project (`./CLAUDE.md` or `./.claude/CLAUDE.md`) →
local (`./CLAUDE.local.md`, gitignored). Loading walks the tree from filesystem root down to cwd;
nested subdirectory files and `.claude/rules/` load on demand
([memory docs](https://code.claude.com/docs/en/memory)). The consequence people miss: **the
user-scope file is silently prepended to every session on the machine, in every context** — a
project fact placed there pays rent in every unrelated session forever.

| Layer | Only this | Never this |
|---|---|---|
| User | Machine-wide, context-neutral defaults: model policy, identity *process*, where things live | Any project or client name; any repo-specific convention |
| Project | Navigation pointers, non-obvious commands, gotchas Claude can't infer | Prose, full documents, anything needed in <80% of that repo's sessions |
| Local | Machine-specific paths and scratch conventions | Anything a collaborator would need |
| Skill | Procedures, reference material, playbooks | Anything needed every session |

Content moves both ways: what proves rare moves *down* into a skill, what Claude gets wrong twice
moves *up*. The official ladder — add to `CLAUDE.md` on the second wrong convention → skill on the
third paste of a playbook → hook when it must happen every time without asking → plugin when a
second repo needs it. ([features overview](https://code.claude.com/docs/en/features-overview))

## 2. The under-200-line rule and its evidence

The number is repeated across three first-party docs: keep `CLAUDE.md` under ~200 lines (150–250 in
the large-codebase guidance), pushing reference material into skills, which cost ~0 tokens until
invoked — and nothing at all when marked `disable-model-invocation: true`
([best practices](https://code.claude.com/docs/en/best-practices),
[large codebases](https://code.claude.com/docs/en/large-codebases)). It isn't aesthetic. Attention
dilutes as context grows; the guidance is to find the smallest set of high-signal tokens that still
produces the outcome
([context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)).
The failure mode is named in the docs — "the over-specified CLAUDE.md," where important rules get
lost in noise and ignored, with ruthless pruning as the fix rather than better formatting. And
Anthropic applied it to itself: ~80% of Claude Code's own system prompt was cut with no measurable
loss on coding evaluations
([coverage](https://techstrong.ai/agentic-ai/anthropic-cut-80-of-claude-codes-system-prompt-heres-why-that-matters-for-your-agents/)).
Include: commands Claude can't guess, non-default style rules, test invocation, repo etiquette,
architectural decisions, environment quirks. Exclude: anything inferable from the code, standard
conventions, API docs better linked than pasted, frequently-changing facts, file-by-file
descriptions, "write clean code"-class platitudes.

## 3. Settings layering and permission semantics

Precedence, highest to lowest: managed policy → CLI args → `.claude/settings.local.json` → project
`.claude/settings.json` → user `~/.claude/settings.json`
([settings docs](https://code.claude.com/docs/en/settings)). **The exception is the important
part.** Permission `allow`/`deny`/`ask` rules don't follow that
precedence — they **merge across all scopes**, and **deny always wins**. So a project-scoped `deny`
closes a hole a user-scoped `allow` opened, and it holds even against directories added at launch
time, which editing an allow-list does not. Conversely a user-scoped `deny` is machine-wide: if
another context legitimately needs that path, scope the deny to the project or you break it
silently. `claudeMdExcludes` also merges across scopes, making it the right lever for suppressing
irrelevant ancestor `CLAUDE.md` files rather than restructuring directories.

**Broad `ask` rules are the quiet killer for unattended runs.** An `ask` rule is a promise that a
human is present. In a scheduled run or background agent nobody answers — the run stalls or fails
at the prompt, surfacing late and looking like a hang rather than a config error. Rule of thumb:
**any tool an unattended workflow depends on must be explicitly allowed or explicitly denied —
never `ask`.** Keep `ask` interactive and narrow (specific commands, not whole tool classes).

## 4. Plugins are a scoping decision

A plugin is not just skills — installing one at user scope registers globally, in every context:
its skill listing, commands, agents, MCP servers, and **hooks**.

- **Skill-listing budget.** The roster is capped (1% of the context window by default, tunable via
  `skillListingBudgetFraction`). A large plugin can dominate it, and once saturated, entries lose
  their descriptions and truncate to bare names. A description-less skill is effectively
  undiscoverable, so the real damage isn't tokens: **your own skills silently stop being found**
  because someone else's plugin ate the budget. `/doctor` flags overruns.
- **Hooks run everywhere**, including sessions unrelated to the plugin's purpose. Audit what they
  read: a telemetry hook that parses the session transcript is one environment variable away from
  shipping unrelated sessions' contents somewhere you never chose for them. Keep such enablement
  variables out of the user-scope `env` block permanently, and record *why* beside the rule so a
  future setup routine doesn't helpfully re-add them.
- **The fix is scoping, not uninstalling.** Set `enabledPlugins: {"<plugin>@<marketplace>": false}`
  in the project settings of every repo that shouldn't see it; verify with `/context` before and
  after — per-key merge behaviour at project scope is worth confirming empirically once.

## 5. Memory hierarchy and the worktree-slug trap

Auto memory is a **separate system** from `CLAUDE.md` — Claude writes it, you don't. It lives per
repo at `~/.claude/projects/<slug>/memory/`, entrypoint `MEMORY.md`, capped at 200 lines / 25 KB
loaded at session start, topic files on demand; machine-local, redirectable via
`autoMemoryDirectory` ([memory docs](https://code.claude.com/docs/en/memory)).
**The slug derives from the working directory, so a git worktree gets its own namespace.** A
worktree writes memory to a slug the primary checkout never sees, and that namespace dies with the
worktree. Not a leak — **guaranteed memory loss across exactly the sessions doing the most
consequential work**, since long refactors are what people run in worktrees. Mitigation: durable
decisions from worktree sessions go into the repo (a plan file, a decision-log entry), not memory.
Second trap: memory under a generic agent namespace is unscoped, read and written by any session
using it in any context. Add a periodic `/memory` glance to the maintenance loop, hunting for facts
from one context in another's folder — auto memory persists what a human never wrote down.

## 6. Identity separation: the layers that hold

Defense in depth, ranked by how early each catches a mistake.
**1. `~/.gitconfig` conditional includes — earliest and cheapest.**
`[includeIf "gitdir/i:~/<tree>/"] path = ~/.gitconfig-<profile>` makes the wrong identity wrong to
*set*, not merely wrong to commit with, and protects every tool that shells out to git
([includeIf guide](https://medium.com/@mrjink/using-includeif-to-manage-your-git-identities-bcc99447b04b),
[conditional includes](https://ingo-richter.io/post/2025/manage-multiple-git-identities-with-conditional-includes/)).
Three sharp edges: use `gitdir/i:` — plain `gitdir:` is case-sensitive, and a case-insensitive
filesystem hands you a path that looks identical and doesn't match; git evaluates includes in file
order, so the stanza must sit **after** `[user]`, and any tool that rewrites the file inverts
precedence silently; and a repo-local `[user]` beats `includeIf` outright, so conditional includes
only protect *future* clones.
**2. Profile-aware commit/push hooks — the backstop.** Wired via `core.hooksPath`, classifying the
repo by remote URL and path, then asserting the expected author. **Data-driven identifiers**: the
hook *logic* can be public, the identifiers must not be — keep regexes, emails, and account IDs in
a gitignored file the hook sources, and fail closed when it's missing. A hook that hard-codes them
publishes a permanent, machine-readable mapping between the exact identities the architecture
exists to separate, and if the hook directory is also carved out of the repo's own secret scan,
nothing catches it. **Check both `git config user.email` and the effective author ident** — config
alone misses environment-variable laundering. **Guard usability**, because a guard that fails
wrongly trains you to reach for `--no-verify`: GUI clients run hooks without a login shell, so
tools resolved via a shell profile's `PATH` are absent — use absolute paths, and distinguish "tool
unavailable" from "wrong account" in the message.
**3. Project-scoped permission denies** (§3) stop cross-context *reads*; **4. a separate `.claude/` per repo** gives each context its own agents, commands, settings, and MCP config.

**Gaps no gitconfig or hook closes**, worth recording as accepted risk rather than assuming away:
the `gh` CLI and any git-over-API path (connector-created commits are server-side, so
`core.hooksPath` is irrelevant and the secret scan never runs); a repo cloned outside its expected
tree, which profile detection misclassifies; and the account layer, where one subscription pools
transcripts, artifacts, and usage. The first has a procedural fix — assert the active account
(`gh api user --jq .login`) before any `gh` operation.

## 7. Why per-identity config-directory splitting was rejected

`CLAUDE_CONFIG_DIR` redirects the **user-level** config root (the `~/.claude` equivalent, including
credentials). It works, and it is the dominant community pattern: one directory per identity behind
a shell alias, each with independent credentials, `CLAUDE.md`, settings, plugins, hooks, and MCP
config — all-or-nothing per invocation. Purpose-built managers exist
([claude-profile](https://github.com/pegasusheavy/claude-code-profiles), [claude-swap](https://github.com/realiti4/claude-swap), [jean-claude](https://github.com/MikeVeerman/jean-claude)),
and consensus is **selective** sync: share identity-agnostic skills and agents; never sync
`CLAUDE.md`, auth, or caches/plans/todos
([profiles writeup](https://blog.wiredgeek.net/tools/claude-code/2026/04/06/managing-multiple-claude-code-profiles.html),
[selective-sync rationale](https://madewithlove.com/blog/running-multiple-claude-accounts-without-logging-out/)).
Rejected here on three grounds. **It is undocumented** — absent from the env-vars and CLI-reference
pages, with a bug report closed "not planned" ([issue 3833](https://github.com/anthropics/claude-code/issues/3833));
its real behaviour had to be reverse-engineered. **It adds a failure mode without removing one** — selection happens per
invocation, so a typo, a forgotten alias, or the wrong shell runs one context with the other's
config and nothing detects it; the existing wall fails closed, an alias fails silently. **It misses
the layers that matter** — it's CLI-only (desktop and cloud sessions load from the account, not
local profile state), and the account layer is where residual pooling lives. There is no native
desktop account switcher ([1](https://github.com/anthropics/claude-code/issues/30565),
[2](https://github.com/anthropics/claude-code/issues/18435)); the answer there is a separate OS user
or browser profile. **Reserve it** for the one case it solves — a second, fully separate
subscription driven from the same shell — and then follow selective sync literally.

## 8. Measurement, and publishing config without leaking it

- **`/context`** — what actually loaded; the only honest before/after for a trim, so take a baseline
  before restructuring. **`/status`** — which settings sources are active, the fastest way to catch
  a layer you forgot exists. **`/doctor`** — validates settings, warns on stripped entries, flags
  skill-budget overruns, and (recent versions) proposes trims to a checked-in `CLAUDE.md`, cutting
  what Claude can derive from the code while keeping non-obvious pitfalls and rationale; run it
  periodically. ([memory docs](https://code.claude.com/docs/en/memory))
- **Config snapshots must be allowlist-synthesized, never redaction-filtered.** If you publish a
  snapshot of your config — as portfolio material or a bootstrap source — build it from an
  **explicit allowlist of keys** (model, status line, effort level, notification flags) rather than
  copying the real file and stripping known-bad fields: a redaction pass removes only what you
  thought to name, an allowlist can only emit what you chose. Same rule for any generated public
  page — route every input through the allowlist, and hand-author narrative sections rather than
  generating them from files never meant to be public.
- **Token-scan the repo on commit, with no carve-outs** — if the scan skips a directory, that
  directory is where identifiers end up. Prefer a tracked, reviewer-gated allowlist of specific
  paths over a blanket exclusion, and keep token classes broad enough to cover adjacent tooling
  names, not just the obvious org string. A carve-out is where the leak will be.

## 9. Ten-minute audit

`/context` (record the number) → `/doctor` (fix everything it names) → delete every
project-specific line from the user-scope `CLAUDE.md` → check each project `CLAUDE.md` against §2's
include/exclude list → disable unused plugins at project scope → `/memory` for cross-context facts
→ confirm `core.hooksPath` resolves to a directory that has the hooks → confirm the `includeIf`
stanza sits after `[user]` and uses `gitdir/i:` → grep every unattended workflow's permission
surface for `ask`. Re-run after any model upgrade, deleting rules that only worked around an older
model's limitation. ([large codebases](https://code.claude.com/docs/en/large-codebases))
