# .claude/ — umbrella Claude config

Agents, skills and commands for umbrella sessions only. Project repos have their own `.claude/`.

## Load-bearing settings (`settings.json`)
- `enabledPlugins: {"posthog@claude-plugins-official": false}` — **do not remove.** That plugin is
  enabled at user level and ships session transcripts to an analytics project. Project settings
  override user settings, so this line is what keeps personal sessions out of it.
- `deny` blocks `gh pr merge`, `gh pr close`, `gh repo delete` and `git push --force`: automation
  never merges or closes. Ask the owner instead.
- `ask` covers `scripts/`, `hooks/`, `tests/`, `.github/`: code changes get a prompt.
- `additionalDirectories` lets worktree sessions reach the primary checkout.
- Machine-local overrides live in `settings.local.json` (gitignored), written by
  `scripts/personal-init.sh`.

## Layout
| Path | What |
|---|---|
| `agents/` | Fleet agents, one file each. Every file sets `model:` explicitly — the frontmatter default is `inherit`, which silently promotes a cheap agent to the session's tier |
| `skills/` | Skills invoked as `/<name>`. `agent-protocol`, `citation-format` and `doc-kit-spec` are reference-only, preloaded into agents |
| `commands/` | Machine commands. Frontmatter must start on line 1 or the description is not parsed |
| `worktrees/` | Agent worktrees, gitignored. Delete once their branch has merged |

`researcher` is invoke-only: no skill or command references it.
