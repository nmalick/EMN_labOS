# hooks/ — the identity wall

Two git hooks, installed machine-wide through `core.hooksPath` rather than per repo, so they cover
every repository on this machine. The logic here is public; the identifiers it matches live in
`identities.local`, which is gitignored and never committed from this repo.

| Hook | Runs on | Checks |
|---|---|---|
| `pre-commit` | Every commit | Refuses if `identities.local` is missing or staged. Scans staged blobs for secret-shaped content and, inside this repo only, for identifiers that must not reach a public surface — `.labos-allow` lists the paths that legitimately carry them |
| `pre-push` | Every push | Verifies the active `gh` account matches the profile, sweeps the author of every outgoing commit, then re-scans the files at the pushed tip. That last sweep is the backstop: merges, rebases and cherry-picks never fire `pre-commit` |

The profile is decided per repo from the remote URL and the checkout path. Each profile accepts
only its own author address and its own GitHub noreply form, never the other's.

## If a hook blocks you
Fix the cause. **Never `--no-verify`** — a bypassed wall is indistinguishable from no wall.

| Message | Cause | Fix |
|---|---|---|
| `identities.local missing` | Fresh machine, or the file moved | Restore it (below). Until then every commit on this machine is blocked, by design |
| `active gh account = …` | The wrong account is active | `gh auth switch -u <account>`, then retry |
| `gh CLI not found` or `returned no login` | PATH problem or expired auth — **not** an account mismatch | Push from a terminal, or run `gh auth status` |
| `unexpected author(s)` | A commit in the push range carries the wrong author | Fix those commits' author, or push from the right profile |
| `secret-shaped content` | A staged or pushed blob matches the secret pattern | Remove the secret. If the file legitimately describes the wall, add its path to `.labos-allow` (a reviewed change) or to `allowlist.local` for a machine-local exception |

Escape hatch for a repo that belongs to neither profile: `git config labos.profile none`.

## Restoring `identities.local`
Both hooks refuse to run without it, so a machine missing it cannot commit anywhere. Restore it
with `bash scripts/labos-config.sh restore`, which pulls it from the private config repo —
`bootstrap.sh` does this automatically and fails rather than reporting success without it.

If that repo is unavailable, the file is plain shell assignments and can be rebuilt by hand:

| Variable | Holds |
|---|---|
| `WORK_EMAIL` · `WORK_GH` · `WORK_NOREPLY` | The work profile's author address, GitHub account and noreply form |
| `PERSONAL_EMAIL` · `PERSONAL_GH` · `PERSONAL_NOREPLY` | The same three for the personal profile |
| `WORK_MATCH_RE` | Matches a remote URL or checkout path belonging to the work profile |
| `SECRET_RE_COMMON` · `PERSONAL_EXTRA_RE` | Secret-shaped content patterns; the personal profile adds the second |
| `LABOS_ROOT_RE` | Matches this repo, so the public-surface token scan runs only here |
| `LABOS_COMMIT_TOKENS` | Identifiers that must never reach a tracked file in this public repo |
| `SNAPSHOT_WORK_TOKENS` · `SNAPSHOT_CLIENT_TOKENS` · `SNAPSHOT_WORK_PLUGINS` | Routing lists for `scripts/snapshot.sh`: which files and plugins stay in the private half |
| `WORK_DIR_GLOB` | The work projects directory. `scripts/personal-init.sh` turns it into a read-deny rule in the gitignored `.claude/settings.local.json` |
| `CONFIG_REPO_RE` | Matches the private config repo — the one place allowed to carry this file in git. The hooks exempt it from the filename rule and the secret scan, and the author check still runs there |

## Keeping the token lists honest
A token list is a filter, not a secret, and each list has a different job: `LABOS_COMMIT_TOKENS`
blocks a commit, `SNAPSHOT_WORK_TOKENS` routes a file into the private half of the snapshot.

Keep a tool name out of the routing list when the same tool is used under both identities. The
email is what distinguishes the accounts; a name that appears in both contexts only misroutes
personal files into the private half, where they disappear from the public snapshot with no error.
