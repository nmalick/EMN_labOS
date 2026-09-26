# templates/

Scaffolding copied into project repos. Editing a template changes only future copies — projects
already scaffolded keep what they got.

| Path | What |
|---|---|
| `doc-kit/` | The `project-os/` documentation kit: folder skeleton, per-doc templates, the frontmatter contract, and a CI baseline. Installed by `/new-project`; the binding contract is [doc-kit/README.md](doc-kit/README.md) |
| `ops/pr-convention.md` | How every repo and every agent opens a PR. Referenced by `/baseline-audit`, `/improve` and `/update-ref` |

No per-stack starters live here. Stack-specific build and verify steps belong in each project's
`project-os/ops/verify.md`, which is where the CI baseline reads them from.
