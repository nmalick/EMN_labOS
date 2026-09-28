# claude-output-docs/

Artifact store for Claude work products. Everything here is hand-written except `roster.md`.

| Path | Holds |
|---|---|
| `plans/` | Design and build plans, including `os-design/` for the labOS plan itself |
| `plans/references/` | Durable reference playbooks: patterns and external citations, not project state |
| `history/` | Records of completed work — what was done, with evidence |
| `research/` | Research outputs. Empty by design today; its stub says so with evidence |
| `roster.md` | **Generated** by `scripts/gen_roster.py` from `.claude/`, gated in CI — never hand-edit |

Every doc carries frontmatter per `templates/doc-kit/frontmatter-spec.md`, so
`scripts/check-freshness.py` covers it. One status taxonomy everywhere:
`DRAFT | IN_PROGRESS | READY | COMPLETE | ARCHIVED | SUPERSEDED | REFERENCE`.

Records are immutable. A history doc's claims were true when it was written, so it carries
`sources: git-history`, an `n/a` verification base and a long TTL instead of asking to be
re-verified every year.

This is a public repo. Only sanitized, written-from-scratch material lands here — never redacted
copies of private material, and no work-org, employer or client identifiers. The commit-time token
scan is a backstop, not the rule.
