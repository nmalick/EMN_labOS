<!-- Hand-authored prose for docs/ai-ops.html. NEVER generated from hooks/ or config
source — that would republish machine internals. Keep it descriptive and identifier-free. -->

# AI-ops architecture notes (hand-authored)

This repository is itself the exhibit: a solo-operator "lab OS" where AI tooling runs the
operating layer. A registry of flat-frontmatter project entries drives every public surface
through a single allowlist gate (default-deny — an entry reaches the catalog only when it is
explicitly public AND deliberately listed), so private work cannot leak by prose.

Two git identities share one machine, separated by layered enforcement: conditional git
identity by path, plus profile-aware commit and push hooks that verify the author, the active
GitHub account, and scan staged blobs for secret-shaped content. The hook logic is public in
this repo; the identifiers it checks live in a machine-local file the hooks refuse to ever
commit.

Documentation is treated as a build artifact with provenance: each project repo carries a
`project-os/` folder whose docs cite `file:line` sources, carry verification timestamps and
TTLs, and are checked by a blind verifier agent that re-derives citations from source without
seeing the author's reasoning. Audits, fixes, and reviews run as a tiered agent fleet —
mechanical checks on small fast models, irreversible judgment on the largest — orchestrated
by a session that validates receipts rather than re-doing work.

Machine replication is one command: a bootstrap script that clones the umbrella and every
registered project, restores an allowlist-synthesized config snapshot, and asserts the
identity wall is actually standing before it reports success.
