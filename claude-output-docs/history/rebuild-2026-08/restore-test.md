---
title: Fresh-machine restore test — evidence
type: ops
project: labos
status: COMPLETE
owner: Malick
created: 2026-08-04
updated: 2026-08-04
last_verified: 2026-08-04
verified_against: n/a (runtime test)
ttl_days: 180
confidence: confirmed
---

# Restore test — 2026-08-04

**Command** (the documented form — the earlier plan draft's version passed vacuously because
`$HOME/EMN_labOS` doesn't exist inside an isolated HOME):

```bash
HOME=/tmp/labos-test LABOS_UMBRELLA=/Users/malick/EMN_labOS \
  bash /Users/malick/EMN_labOS/scripts/bootstrap.sh --config-only
```

A **stale-agent canary** (`agents/zz-stale-canary.md`) was planted in the isolated HOME before
the run to prove the new pruning restore actually removes retired files.

## Assertions — 9/9 pass

| # | Assertion | Result |
|---|---|---|
| 1 | `CLAUDE.md` restored | ✓ |
| 2 | `settings.json` restored | ✓ |
| 3 | `statusline.sh` restored + executable | ✓ |
| 4 | `/personal-init` globally linked (reachable before entering any repo) | ✓ |
| 5 | memory restored to the derived project slug | ✓ |
| 6 | **no `permissions` block** in the published settings (allowlist synthesis held) | ✓ |
| 7 | **planted stale canary PRUNED** (the additive-restore bug is fixed) | ✓ |
| 8 | prior config backed up to `backups/pre-bootstrap-<ts>` | ✓ |
| 9 | `core.hooksPath` **absent** under `--config-only` — the flag skips the identity wall **by design**, now stated in its help text | ✓ |

## Contract changes verified by this run

- `restore()` **prunes** (rsync `--delete` / rm-then-copy) — a restore is authoritative, so
  retired agents/commands cannot survive on a future machine.
- `mcp-accounts.json` is **never clobbered** when a live multi-account file exists.
- Global entry points link from **either** `commands/*.md` or `skills/<name>/` (the Phase-4b
  migration would otherwise have silently broken fresh-machine setup).
- Full mode now **fails closed**: it asserts `core.hooksPath` resolves to a directory containing
  both hooks, so a "successful" bootstrap can never leave the wall down.
