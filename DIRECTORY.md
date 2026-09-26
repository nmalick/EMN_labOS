# EMN_labOS — directory index

On-demand map of the umbrella. Load this when you need to know where something lives.

## OS files (tracked, public)
| Path | Purpose |
|---|---|
| `CLAUDE.md` | Lean root context (loads every session — and as the auto-loaded ancestor of every project repo under this directory) |
| `WORKING-RULES.md` · `VOICE.md` | Session rules and the writing standard, imported by `CLAUDE.md` so they load everywhere |
| `DIRECTORY.md` | This index |
| `README.md` | **Generated** catalog table (do not hand-edit) |
| `docs/` | **Generated** public pages: `index.html` (catalog) · `ai-ops.html` (AI-operations showcase) · `projects-corpus.json` (machine-readable records + doc index) |
| `.gitignore` | Deny-all + allowlist (linchpin of public/private separation). `scripts/check-tracked.sh` trips on silent swallows |
| `.labos-allow` | Path allowlist for the public-repo token scan in `hooks/pre-commit` (reviewer-gated changes) |
| `hooks/` | `pre-commit` + `pre-push` identity guards (logic public; identifiers in gitignored `hooks/identities.local`) |
| `.claude/` | Umbrella project settings + agents/skills (explicit-subpath allowlist; worktrees/local state never tracked) |
| `registry/` | Source of truth for the catalog: `<project>.md` frontmatter (see `registry/README.md` for the v2 contract) · hand-authored `ai-ops-prose.md` · **generated** `<slug>-index.md` pointer indexes |
| `scripts/` | `catalog_sync.py` (+`--check`) · `check_clone_list.py` · `collect-local-registry.py` · `check-tracked.sh` · `check-freshness.py` · `snapshot.sh` · `bootstrap.sh` · `labos-config.sh` · `personal-init.sh` · shared `lib/registry.py` |
| `tests/` | Default-deny regression tests (run by CI on every push/PR) |
| `.github/workflows/ci.yml` | Catalog drift gate + tests + tripwire + doc freshness |
| `home-claude/` | **Generated** allowlist-synthesized public snapshot of `~/.claude` (restored by bootstrap) |
| `templates/` | The `doc-kit/` project-os template set + `ops/pr-convention.md` |
| `claude-output-docs/` | Artifact store: `plans/` `research/` `history/` (incl. the rebuild tracker) |

## Machine-local (gitignored, by design)
| Path | Purpose |
|---|---|
| `home-claude.local/` | Private half of the config snapshot (global CLAUDE.md + memory). Written by `snapshot.sh`, published by `labos-config.sh push` |
| `registry.local/` | Private projects' registry entries, assembled by `collect-local-registry.py` from each repo's `project-os/registry-entry.md` — never hand-edited |
| `hooks/identities.local` | Identity + pattern data for the hooks. Restored from the private config repo; the hooks fail closed without it |
| `hooks/allowlist.local` | Optional per-path scan exceptions |

## The private config repo (`nmalick/labos-config`, cloned to `~/.labos-config`)
| File | Restores to |
|---|---|
| `identities.local` | `hooks/identities.local` |
| `home-claude.local/` | `home-claude.local/`, then `~/.claude/` via bootstrap |
| `clone-list.tsv` | the project clone loop — `<url>⇥<bucket-dir>⇥<slug>`, read as inert data |

Managed with `scripts/labos-config.sh <clone|restore|push|status>`. It is the one repo
`hooks/pre-commit` exempts from the `identities.local` filename rule and the secret scan (via
machine-local `CONFIG_REPO_RE`); the author check still runs there.

## Machine commands
| Command | Purpose |
|---|---|
| `/personal-init` | Switch gh→personal, enforce git identity/hooks (fail-closed on a broken hooksPath), report vercel/npm + connector group. Run each session. |
| `/labos-replicate` | Fresh-machine bootstrap (curl one-liner) + snapshot/manifest maintenance. |
| `/catalog-sync` | Regenerate every public surface from `registry/` (default-deny; `--check` = drift gate). |
| `scripts/labos-config.sh` | The private config repo, both directions. Not a slash command — run it directly. |

## Projects (on disk, gitignored)
| Bucket | Projects |
|---|---|
| `personal-projects/` | Qari, qari-assets, emnlabs_site |
| `freelance-projects/` | art_is_everywear |
| `pocs/` | bil-app, safar |

Each project's documentation lives in its own repo under `project-os/` — the generated
`registry/<slug>-index.md` pointer indexes route into them from here.
