<!-- Hand-authored prose for docs/ai-ops.html. NEVER generated from hooks/ or config
source — that would republish machine internals. Keep it descriptive and identifier-free. -->

# AI-ops architecture notes (hand-authored)

This repo is the exhibit: a one-person "lab OS" where AI tooling runs the operating layer. One
registry file per project drives every public page through a single allowlist gate. The default
is deny — a project appears only when it is marked public and deliberately listed — so private
work cannot leak through prose someone forgot to update.

Two git identities share one machine, kept apart by layers that each fail closed. Git picks the
author by directory. Commit and push hooks check that author, the active GitHub account, and the
staged content for anything secret-shaped. The hook logic is public here; the identifiers it
matches sit in a machine-local file the hooks refuse to commit.

Documentation is a build artifact with provenance. Each project repo carries a project-os folder
whose docs cite file and line, carry a verification date and a TTL, and are checked by a separate
agent that re-derives every citation from the source without seeing the author's reasoning.
Audits, fixes and reviews run as a tiered fleet: mechanical checks on small models, and judgment
that is expensive to get wrong on the largest.

Replication is one command. A bootstrap script clones the umbrella and every registered project,
restores a curated config snapshot, and refuses to report success unless the identity wall is
actually standing.
