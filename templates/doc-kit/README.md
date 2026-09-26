# doc-kit — the project-os/ template set

Every project repo gets a thin root `CLAUDE.md` router, `.claude/` settings, and
**`project-os/`** holding all documentation.

Code never moves. The root also keeps `README*`, `LICENSE*`, `AGENTS.md` (vendor-managed where
present) and all code, config and CI — the `ALWAYS_ROOT` set. `README.md` is rewritten in place as
a public-facing summary that links into `project-os/`.

## Kit layout

```
<repo>/
├── CLAUDE.md                    ← root router (thin; see root-CLAUDE.template.md)
├── .claude/settings.json
└── project-os/
    ├── CLAUDE.md                ← conventions (frontmatter/citations; auto-loads on demand)
    ├── DIRECTORY.md             ← the index; "Reference when" table drives the umbrella pointer index
    ├── engineering/             ← architecture.md (cursor header!), features/, adr/
    ├── product/                 ← feature inventory, PRDs, status
    ├── history/                 ← <period>.md event log (see history-template)
    ├── plans/                   ← active plans, legacy/ migrations, improvement-backlog.md
    ├── research/
    ├── design/
    ├── ops/                     ← verify.md, ref-map.md, secrets.md, backup.md, releases.md
    └── analytics/
```

A project may add a folder the kit doesn't list when it earns one (for example a
`knowledge-base/` for an upstream research corpus). It documents it in its own `DIRECTORY.md`.

Empty folders ship a stub README carrying an **honest negative assertion with evidence** (see
`stub-README.template.md`) plus full frontmatter, so the freshness gate covers them rather than
skipping them as untracked.

## Conventions (binding)

- Frontmatter per frontmatter-spec.md; one status taxonomy:
  `DRAFT | IN_PROGRESS | READY | COMPLETE | ARCHIVED | SUPERSEDED | REFERENCE`.
- A doc with unresolved `Inferred — needs review` markers can never be `READY`.
- Supersession is `superseded_by:` — never silent overwrite, never in-place retraction.
- Every non-trivial claim carries `file:line`; negative claims are stated explicitly with
  evidence ("No X anywhere in Y — confirmed from <file:line>, <sha>").
- The umbrella's `CLAUDE.md` is an auto-loaded ancestor of every project under it — project
  routers never restate identity/account rules. `claudeMdExcludes` is the escape hatch.
- Legacy docs migrate per a written mapping table: one pure `git mv` commit, whose SHA is
  recorded in `history/` as the archaeology boundary, then a second commit that rewrites links.
- Runtime-consumed paths never move. A pre-migration `git grep` reclassifies any such hit to STAYS.
