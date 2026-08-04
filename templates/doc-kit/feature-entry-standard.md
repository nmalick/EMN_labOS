# Feature-entry standard (product/features.md rows)

Applicability-matrix style — every feature the code OR the founding docs ever promised gets a
row; absence of a row is never evidence. Statuses are first-class:

| Status | Meaning |
|---|---|
| SHIPPED | In the code, reachable by a user — entry-point evidence required |
| PARTIAL | In the code, incomplete or gated — say exactly what's missing |
| PIVOTED | Planned as X, shipped as Y — cite both the plan doc and the shipped code |
| PLANNED-NOT-BUILT | Promised in docs/PRD, absent from code — cite the promise AND the absence (manifest/grep evidence) |
| DROPPED | Built then removed/abandoned — cite the removal commit or archive tag |

Row shape: `| Feature | Status | Evidence (file:line / commit) | Doc trail (plan/PRD at its
current path) | Notes |`

Rules: negative assertions carry evidence ("absent from <manifest> at <sha>"), never bare;
PIVOTED/PLANNED-NOT-BUILT rows are what kill doc myths — they are the inventory's highest-value
content, not an appendix; every row's evidence must survive the blind verifier (cite reachable
commits only).
