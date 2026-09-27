# claude-output-docs/ — artifact store

Hand-written work products: plans, reference playbooks, and records of completed work. `roster.md`
is the one generated file.

## Rules
- **This is a public repo.** Only sanitized, written-from-scratch material: no work-org, employer or
  client identifiers, and never a redacted copy of private material. The commit-time token scan is a
  backstop, not the rule.
- **Every doc carries doc-kit frontmatter** (`templates/doc-kit/frontmatter-spec.md`), so the
  freshness gate covers it. A doc without it is invisible to the gate, and silence is not a pass.
- **Records are immutable.** A finished record keeps `sources: git-history`, an `n/a` verification
  base and a long TTL. Correct it by adding a superseding doc, not by editing what it claimed at the
  time.
- **`roster.md` is generated** by `scripts/gen_roster.py` and gated in CI. Run the script; never
  hand-edit the file.
- **Empty folders say so with evidence** — a stub README carrying a negative assertion and
  frontmatter, exactly as the doc kit requires of projects. Not a `.gitkeep`.
