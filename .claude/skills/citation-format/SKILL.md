---
name: citation-format
description: The exact citation grammar + CITATION_MANIFEST line format shared by the doc writer and the blind verifier. Reference skill; preloaded into both.
---

# Citation format (shared grammar — writer and verifier read THIS file)

In-doc citation: `path/from/repo/root.ext:LINE` or `path.ext:LINE:symbolName`.
Ranges: `path.ext:START-END`. Commit evidence: `commit <short-sha>`. Tag: `tag <name>`.

`CITATION_MANIFEST` (one line per claim, written next to the doc as `<doc>.citations`):
```
<doc-relpath>:<doc-line> -> <src-relpath>:<src-line>[:<symbol>]
<doc-relpath>:<doc-line> -> commit <short-sha>
<doc-relpath>:<doc-line> -> INFERRED
```
Rules:
- Every assertive, non-trivial claim line in the doc appears in the manifest.
- `INFERRED` manifest lines MUST correspond to an in-doc `Inferred — needs review` tag (1:1).
- Writer self-filter before handoff: extract the manifest, drop/fix citations whose file
  obviously doesn't exist. (Cheap pass only — the blind verifier does the real check.)
- Verifier judgment tolerances: line drift ±5 lines with matching content = `LINE_DRIFT`
  (non-blocking); missing file or missing symbol = blocking FAIL.

## Evidence-class suffixes (multi-branch history)

When a doc cites commits from more than one reachability class, EVERY auditor writing ANY
surface must use the suffix — not just the history auditor:
- reachable from origin/main → no suffix (default)
- reachable only from a local archive tag → `commit <sha> (archive-tag evidence, local-only)`
- reachable only from the integration branch → `commit <sha> (rebuild-branch evidence)`
The blind verifier classifies suffixed lines as documented-unreachable; an unsuffixed
non-main SHA is a FAIL. Orchestrators: pass the suffix rule to product/ops/analytics auditors
too whenever a repo has rescued/pre-reset history, or they emit it clean and the verifier
fails the whole set on a mechanical gap.
