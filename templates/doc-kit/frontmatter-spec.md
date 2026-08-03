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
verified_against: <git sha>  # the commit claims were verified against
ttl_days: 90                 # 180 for architecture docs, 90 default, 365 for REFERENCE
sources: path/a.py:12, path/b.ts:40   # comma-joined file:line pairs (freshness gate resolves these)
confidence: confirmed | inferred | unknown
superseded_by:               # path of the successor when status=SUPERSEDED
related:                     # comma-joined paths
---
```

Checked mechanically by `scripts/check-freshness.py`: TTL expiry, `sources` resolution,
`verified_against` ancestry vs origin/main. Promotion gate: unresolved
`Inferred — needs review` ⇒ never `READY`.
