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
| `scripts/` | `catalog_sync.py` · `personal-init.sh` · `bootstrap.sh` · `gen_manifest.py` · `snapshot.sh` |
| `home-claude/` | **Generated** secret-free snapshot of global `~/.claude` (restored by bootstrap) |
| `manifest.sh` | **Generated** clone list (from `registry/*.md`) sourced by `bootstrap.sh` |
| `templates/` | Per-stack starters |
| `docs/` | Generated standalone HTML (portfolio-reusable) |
| `claude-output-docs/` | Artifact store: `plans/` `research/` `history/` |

## Machine commands
| Command | Purpose |
|---|---|
| `/personal-init` | Switch gh→`nmalick`, enforce git identity/hooks, report vercel/npm + connector group. Run each session. |
| `/labos-replicate` | Fresh-machine bootstrap (curl one-liner) + snapshot/manifest maintenance. |

> Clone entries for repos that must stay out of the public repo go in gitignored `manifest.local.sh`
> instead of `registry/` (leave that entry's `repo_url` empty). Nothing uses this today — the one
> freelance project has launched and is catalogued normally — but the path stays open for the next one.

## Projects (on disk, gitignored)
| Bucket | Projects |
|---|---|
| `personal-projects/` | Qari, qari-assets, emnlabs_site |
| `freelance-projects/` | art_is_everywear |
| `pocs/` | bil-app |
