# registry/

Source of truth for the project catalog and every public surface. One `<project>.md` per
project. **Flat scalars only** — the parser rejects YAML lists loudly; list-shaped fields are
comma-joined strings. Parsed/validated by `scripts/lib/registry.py` (shared by `catalog_sync`,
`gen_manifest`, and the CI regression tests).

```yaml
---
name: <display name>
slug: <directory name inside the bucket>
bucket: personal | freelance | poc
visibility: public | anonymized | private
status: <e.g. active, paused, support, poc, live>
showcase: true | false          # opt-in public listing for projects with no live_url
live_url: <url or empty>
repo_url: <url or empty>
repo_public: true | false
stack: <comma-joined, e.g. Next.js, TypeScript, Vercel>
summary: <one line>
mcps: <comma-joined MCP server names, optional>
mcps_verified: <YYYY-MM-DD the mcps list was last probed, optional>
highlights: <comma-joined public-safe highlights, optional>
docs_status: baselined | partial | stale | none   # optional
docs_verified: <YYYY-MM-DD, optional>
---
```

## Eligibility (default-deny)

A project reaches a public surface **only** when
`visibility ∈ {public, anonymized}` **AND** (`live_url` non-empty **OR** `repo_public: true`
**OR** `showcase: true`). Everything else is omitted from every artifact, and `catalog_sync`
prints an `OMITTED (why)` line per exclusion so deny decisions are auditable.

## Publication decisions (recorded, per field)

| Field | Public? | Rule |
|---|---|---|
| `name, slug, bucket, status, stack, live_url, summary, highlights, showcase` | yes | via the `public_record` allowlist — the only path to output |
| `repo_url` | only when `repo_public: true` | |
| `mcps` | yes, **except `bucket: freelance`** (client tooling stays private) and only while `mcps_verified` is fresh | AI-ops page + corpus |
| `docs_status`, `docs_verified` | **no** | internal maintenance signal only |

## Generated neighbors in this directory

`<slug>-index.md` files are **generated pointer indexes** (from each project's own
`project-os/DIRECTORY.md`) — never hand-edit. `ai-ops-prose.md` is the one hand-authored
file here: the prose for `docs/ai-ops.html` (kept identifier-free; never generated from
hook/config source).

## Manifest policy

`gen_manifest.py` writes clone lines for `repo_public: true` entries into the tracked, public
`manifest.sh`; all other entries with a `repo_url` go into the **gitignored**
`manifest.local.sh` (maintained by the same script, sourced by `bootstrap.sh`, never
committed). Private and client repo URLs never appear in the public repo.

## Deliberate omissions

`football-stats-fe` and the 12 pre-2020 public repos on the account are **archive, not
catalogued** — their absence is a decision, not an oversight. Revisit only if one is revived.
