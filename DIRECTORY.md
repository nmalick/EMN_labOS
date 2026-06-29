# EMN_labOS — directory index

On-demand map of the umbrella. Load this when you need to know where something lives.

## OS files (tracked, public)
| Path | Purpose |
|---|---|
| `CLAUDE.md` | Lean root context (loads every session) |
| `DIRECTORY.md` | This index |
| `now.md` | Current focus, high-signal |
| `README.md` · `STATUS.md` · `ROADMAP.md` · `RELEASE-NOTES.md` | **Generated** catalog (do not hand-edit) |
| `projects.json` | **Generated** machine artifact the portfolio consumes |
| `.gitignore` | Deny-all + allowlist (linchpin of public/private separation) |
| `.mcp.json` | Personal MCP profile only (Slack/Figma/Notion) |
| `hooks/` | `pre-commit` + `pre-push` identity guards (`core.hooksPath`) |
| `.claude/` | Self-contained agents + commands (clean copy, genericized) |
| `registry/` | `<project>.md` frontmatter — source of truth for the catalog |
| `templates/` | Per-stack starters |
| `docs/` | Generated standalone HTML (portfolio-reusable) |
| `claude-output-docs/` | Artifact store: `plans/` `research/` `history/` |

## Projects (on disk, gitignored)
| Bucket | Projects |
|---|---|
| `personal-projects/` | Qari, qari-assets, emnlabs_site |
| `freelance-projects/` | _(private; gitignored)_ |
| `pocs/` | bil-app |
