# Frontmatter spec (machine-parseable contract — flat scalars only)

```yaml
---
title: <short title>
type: architecture | product | history | plan | research | design | ops | analytics | reference
project: <slug>
status: DRAFT | IN_PROGRESS | READY | COMPLETE | ARCHIVED | SUPERSEDED | REFERENCE
owner: Malick
created: YYYY-MM-DD
updated: YYYY-MM-DD          # content edits
last_verified: YYYY-MM-DD    # when claims were last checked against code — NOT the same as updated
verified_against: <git sha>  # the commit claims were verified against (or a sentinel, below)
ttl_days: 90                 # 180 for architecture docs, 90 default, 365 for REFERENCE
sources: path/a.py:12, path/b.ts:40   # comma-joined file:line pairs, or a sentinel (below)
confidence: confirmed | inferred | unknown
superseded_by:               # path of the successor when status=SUPERSEDED
related:                     # comma-joined paths
---
```

## What the gate enforces
`scripts/check-freshness.py` in the umbrella is canonical — the CI baseline fetches it rather than
vendoring a copy. It reads four fields and reports:

| Finding | Cause | Fix |
|---|---|---|
| `TTL_STALE` | `last_verified` + `ttl_days` is in the past | Re-verify the claims, then bump both |
| `SOURCE_MISSING` | A `sources` path no longer resolves | Fix the citation |
| `STALE_BASE` | `verified_against` exists but is not an ancestor of `origin/main` | Code moved since verification: re-verify |
| `UNKNOWN_BASE` | `verified_against` is not in this clone at all | Fetch, or the commit died with a squash-merged branch: re-verify against a live commit |
| `BAD_FRONTMATTER` | `last_verified` or `ttl_days` unparsable | Fix the values |
| `BAD_BASE` | `verified_against` is neither a SHA nor an `n/a` sentinel | Use one or the other |

`sources` accepts `path:line` and `path:line-line` ranges. A doc carrying none of
`last_verified`, `sources` or `verified_against` is counted UNTRACKED and skipped — silence is not
a pass.

## Sentinels
Some docs verify against something other than files at a commit. Two values are exempt by design:

| Value | Use |
|---|---|
| `verified_against: n/a (external references)` | The doc verifies against sources outside the repo. Exempt from the ancestry check |
| `sources: git-history` | The claims derive from git history rather than file contents — history and changelog docs. Exempt from path resolution |

## Promotion gate
A doc with unresolved `Inferred — needs review` markers is never `READY`, whatever its other
fields say.
