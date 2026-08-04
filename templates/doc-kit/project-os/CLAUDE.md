# project-os conventions (auto-loads when docs here are read)

- Frontmatter per `frontmatter-spec` (see the umbrella `templates/doc-kit/frontmatter-spec.md`):
  status taxonomy `DRAFT|IN_PROGRESS|READY|COMPLETE|ARCHIVED|SUPERSEDED|REFERENCE`;
  `last_verified` + `verified_against` + `ttl_days` + `sources` are what the freshness gate reads.
- Citations: every non-trivial claim carries `file:line` (paths relative to the repo root).
  Anything not observed in code is tagged `Inferred — needs review` in place; a doc with
  unresolved tags is never `READY`.
- Supersession via `superseded_by:` — never silently overwrite a doc that disagrees with code;
  record the contradiction, supersede deliberately.
- Negative assertions are stated with evidence, not implied by silence.
- History entries use the event-type vocabulary and always carry `**Verified**:` evidence.
- Code edits are out of scope for doc sessions — route improvement ideas to
  `plans/improvement-backlog.md` (T1/T2/T3).
