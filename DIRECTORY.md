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
| `scripts/` | `catalog_sync.py` (+`--check`) · `gen_manifest.py` · `check-tracked.sh` · `check-freshness.py` · `snapshot.sh` · `bootstrap.sh` · `personal-init.sh` · shared `lib/registry.py` |
| `tests/` | Default-deny regression tests (run by CI on every push/PR) |
| `.github/workflows/ci.yml` | Catalog drift gate + tests + tripwire + doc freshness |
| `home-claude/` | **Generated** allowlist-synthesized public snapshot of `~/.claude` (restored by bootstrap) |
| `manifest.sh` | **Generated** clone list — `repo_public` entries only |
| `templates/` | The `doc-kit/` project-os template set + `ops/pr-convention.md` |
| `claude-output-docs/` | Artifact store: `plans/` `research/` `history/` (incl. the rebuild tracker) |

## Machine-local (gitignored, by design)
| Path | Purpose |
|---|---|
| `home-claude.local/` | Private half of the config snapshot (global CLAUDE.md + memory) |
| `manifest.local.sh` | Private/client clone lines (generated; sourced by bootstrap) |
| `hooks/identities.local` | Identity + pattern data for the hooks (never staged — hook-enforced) |
| `hooks/allowlist.local` | Optional per-path scan exceptions |

## Machine commands
| Command | Purpose |
|---|---|
| `/personal-init` | Switch gh→personal, enforce git identity/hooks (fail-closed on a broken hooksPath), report vercel/npm + connector group. Run each session. |
| `/labos-replicate` | Fresh-machine bootstrap (curl one-liner) + snapshot/manifest maintenance. |
| `/catalog-sync` | Regenerate every public surface from `registry/` (default-deny; `--check` = drift gate). |

## Projects (on disk, gitignored)
| Bucket | Projects |
|---|---|
| `personal-projects/` | Qari, qari-assets, emnlabs_site |
| `freelance-projects/` | art_is_everywear |
| `pocs/` | bil-app, safar |

Each project's documentation lives in its own repo under `project-os/` — the generated
`registry/<slug>-index.md` pointer indexes route into them from here.
