---
name: doc-kit-spec
description: The project-os doc-kit contract — folder layout, frontmatter fields, status taxonomy, supersession and negative-assertion rules. Reference skill; preloaded into fleet agents.
---

# doc-kit spec (authoritative summary)

Full templates: `templates/doc-kit/` in the umbrella repo. Binding rules:

- Layout: root router `CLAUDE.md` + `.claude/` + `project-os/{engineering,product,history,
  plans,research,design,ops,analytics}` (+`knowledge-base/` where warranted); `DIRECTORY.md`
  at `project-os/DIRECTORY.md`. `ALWAYS_ROOT`: README*, LICENSE*, AGENTS.md, all code/config/CI.
- Frontmatter (flat scalars): `title,type,project,status,owner,created,updated,last_verified,
  verified_against:<sha>,ttl_days,sources:<file:line, comma-joined>,confidence,superseded_by,related`.
- One status taxonomy: `DRAFT|IN_PROGRESS|READY|COMPLETE|ARCHIVED|SUPERSEDED|REFERENCE`.
- Promotion gate: any unresolved `Inferred — needs review` marker ⇒ the doc cannot be `READY`.
- Supersession via `superseded_by:` — contradictions with existing docs are REPORTED in the
  receipt, never silently overwritten.
- Negative assertions are explicit with evidence: "No X in this project — confirmed absent
  from <file/manifest> (verified <sha>, <date>)".
- History files use event types `SHIPPED·DECISION·REFACTOR·PIVOT·DROPPED·EXPERIMENT·FIX`,
  carry `**Verified**:` evidence per entry, and include `## Experiments` and
  `## Unfinished Plans / Dropped` sections (a Dropped row is REQUIRED before any branch deletion,
  with `recover: git checkout archive/<name>`).
- Architecture docs carry the cursor header (`Last commit checked: <sha>`) + `## Maintenance Log`.
