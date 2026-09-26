# registry/

Source of truth for the catalog. One file per project; `/catalog-sync` generates every public
surface from these files. Parsed and validated by `scripts/lib/registry.py`, shared by
`catalog_sync`, `check_clone_list` and the CI tests.

**Flat scalars only.** The parser rejects YAML lists loudly; list-shaped fields are comma-joined
strings.

## Where an entry lives
| Folder | Tracked | For |
|---|---|---|
| `registry/` | Yes, public | Projects that are catalogued, or ready to be |
| `registry.local/` | No, gitignored | Private projects. `registry/` is world-readable, so an entry there describes the project — name, summary, stack, repo URL — even when `visibility: private` keeps it out of every generated surface |

A `registry.local/` entry that would publish is a validation error. CI never sees that folder, so
publishing from it would pass `--check` locally and fail in CI. Move the file into `registry/`
when the project goes public.

## Contract
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
A project reaches a public surface **only** when `visibility ∈ {public, anonymized}` **AND**
(`live_url` non-empty **OR** `repo_public: true` **OR** `showcase: true`). Everything else is
omitted from every artifact, and `catalog_sync` prints an `OMITTED (why)` line per exclusion so
deny decisions are auditable.

## What each field publishes
| Field | Public? | Rule |
|---|---|---|
| `name, slug, bucket, status, stack, live_url, summary, highlights, showcase` | Yes | Via the `public_record` allowlist — the only path to output |
| `repo_url` | Only when `repo_public: true` | Controls the repo link in generated surfaces, not whether the URL is readable here — see Manifest policy |
| `mcps` | Yes, **except `bucket: freelance`** (client tooling stays private) | AI-ops page and corpus. `mcps_verified` is **not** read by the generator: freshness is a `/labos-maintenance` re-probe duty, not a publication gate (a date-based gate would make `--check` depend on today) |
| `docs_status`, `docs_verified` | No | Internal maintenance signal only |

## Files that are not entries
`README.md`, `CLAUDE.md`, `ai-ops-prose.md` and `*-index.md` are skipped by the loader
(`SKIP_FILES` in `scripts/lib/registry.py`). Every other `.md` here must parse as an entry, or
`catalog_sync` and `check_clone_list` exit non-zero and CI goes red.

## Generated neighbors
`<slug>-index.md` files are generated pointer indexes, built from each project's own
`project-os/DIRECTORY.md` — never hand-edit them. Project folders are gitignored, so when one is
not on disk (CI, a worktree, an un-cloned bucket) the committed index body is carried forward
instead of regenerated; refresh pointers from the primary checkout. An index with no eligible
entry behind it is deleted by `catalog_sync` and fails `--check`.

`ai-ops-prose.md` is the one hand-authored file here: the prose for `docs/ai-ops.html`, kept
identifier-free and never generated from hook or config source.

## Clone-list policy
The project clone list is **not generated and not in this repo**. It is `clone-list.tsv` in the
private config repo (`nmalick/labos-config`), hand-maintained, and read by `bootstrap.sh` as
inert data. `manifest.sh`, `manifest.local.sh` and `gen_manifest.py` were retired with it
(2026-09): a tracked public manifest could only ever list the one public repo, so a fresh
machine cloned one repo out of six.

Hand-maintaining a list drops the generator's guarantee that it matches this folder, so
`scripts/check_clone_list.py` reports the difference instead — MISSING, EXTRA, MISMATCH. It is
not a CI gate: CI never sees the private repo. Run it from `/labos-replicate` and the
`/labos-maintenance` sweep.

**When to update the list:** a new project with a `repo_url`, a repo rename or transfer, or a
project retired. Adding a registry entry is not enough — nothing propagates it for you.

`EMN_labOS.md` catalogues this repo itself. `check_clone_list.py` skips any entry whose
`repo_url` matches this repo's own remote, and flags the umbrella as EXTRA if it ever appears in
the list, so bootstrap never clones the umbrella into a bucket folder.

**Repo URLs in this folder are not secret.** A tracked entry carries its `repo_url` whether or not
the repo is public, so a private repo's URL is readable here; `repo_public` controls only whether
a repo link reaches the generated surfaces. Cloning still requires authentication. Private
*projects* avoid the exposure entirely by living in `registry.local/`.

## Deliberate omissions
`football-stats-fe` and the 12 pre-2020 public repos on the account are archive, not catalogued.
Their absence is a decision, not an oversight. Revisit only if one is revived.
