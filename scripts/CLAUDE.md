# scripts/ — generators, gates, machine setup

Everything here is executable policy: CI runs the gates, bootstrap builds a machine, and the
generators own every public surface. Edits prompt for approval (the `ask` rule in
`.claude/settings.json`).

## What runs what
| Script | Run by | Job |
|---|---|---|
| `catalog_sync.py` | `/catalog-sync`, CI, `/labos-maintenance` | Generates README, `docs/`, index files. `--check` is the drift gate |
| `lib/registry.py` | Every generator and the tests | Frontmatter parsing, the publication gate, validation |
| `check-tracked.sh` | CI, `/labos-maintenance` | Trips when the deny-all `.gitignore` swallows a top-level path |
| `check-freshness.py` | CI, `/labos-maintenance`, project CI via the doc-kit template | TTL expiry, citation rot, stale or missing verification base |
| `snapshot.sh` | `/labos-replicate`, before committing config | Curated `~/.claude` → `home-claude/` and `home-claude.local/` |
| `personal-init.sh` | Every session, and bootstrap | Account checks, plus the machine-local work-folder guard |
| `bootstrap.sh` | A fresh machine, via curl | Clone, identity wall, projects, config restore |
| `gen_manifest.py` | `/labos-replicate` | Clone lists from the registry |

## Rules
- **Fail closed.** A guard that cannot read its inputs exits non-zero instead of proceeding with
  defaults. `snapshot.sh` refuses to run without `hooks/identities.local`; `personal-init.sh` stops
  on an identity mismatch; `bootstrap.sh` asserts the hooks are in place before reporting success.
- **Identifiers stay machine-local.** Work identifiers and paths live in `hooks/identities.local`
  (gitignored) — never in a script here. When a script needs them, resolve that file across this
  checkout, the primary checkout and the global `core.hooksPath`, and prefer the copy that actually
  defines the variable: a worktree can hold a stale copy, and taking it silently skips the guard.
- **Generators are pure functions of tracked inputs.** `catalog_sync.py` reads no git history: a
  squash-merge, or the commit carrying the regeneration itself, would re-date anything derived from
  it. `--check` must mean "a write run would change nothing" in CI exactly as locally.
- **Distinguish failure modes in gate output.** A finding names the fix, so two causes that need
  different fixes are two findings — `STALE_BASE` (re-verify the doc) is not `UNKNOWN_BASE` (fetch,
  or the commit died with a squash-merged branch).
- **After changing anything here**, run all four gates: `catalog_sync.py --check`,
  `tests/test_default_deny.py`, `tests/test_freshness.py`, `check-tracked.sh`, and
  `check-freshness.py --root claude-output-docs --repo .`.
