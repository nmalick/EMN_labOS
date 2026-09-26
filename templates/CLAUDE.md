# templates/ — scaffolding for project repos

Copied into project repos by `/new-project` and the baseline audit. Nothing here runs as part of
the umbrella.

## Rules
- **An edit here changes only future copies.** Projects already scaffolded keep what they got;
  retrofitting one is a deliberate change in that repo (`/update-ref`, or a PR there).
- **Templates stay generic.** No project- or client-specific instructions: a note that applies to
  one repo belongs in that repo's own `CLAUDE.md`.
- **The binding contract is [doc-kit/README.md](doc-kit/README.md)**, mirrored in
  `.claude/skills/doc-kit-spec`. Change one and change the other, or the agents and the templates
  disagree about the same kit.
- **Keep the frontmatter spec and the gate in step.** `doc-kit/frontmatter-spec.md` documents what
  `scripts/check-freshness.py` actually enforces, sentinels included. A field the gate ignores is
  documentation, not a contract — say which it is.
- **`doc-kit/ci-baseline.yml` fetches the canonical freshness script** from the umbrella instead of
  vendoring a copy. Don't turn it back into a copy: copies rot apart silently, and no project had
  the vendored path this template used to assume.
