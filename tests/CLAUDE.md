# tests/ — what CI actually proves

Three files, each run by `.github/workflows/ci.yml` on every push and PR. They are the only
mechanical evidence that a change to the generators, the gates or the wall still behaves.

| File | Covers |
|---|---|
| `test_default_deny.py` | The publication gate and the catalog generator: eligibility matrix, the allowlist path to output, kit carry-forward, orphan index files, the git-free stamp, `registry.local/` rules |
| `test_freshness.py` | The doc-freshness gate's four findings, against throwaway git fixtures |
| `test_hooks.py` | `hooks/pre-commit` driven against a throwaway repo: author, secret scan, the identity-file rule, the public-surface token scan and its scoping |

## Rules
- **Synthetic identifiers only.** Fixtures use `example.test` addresses and invented token strings.
  Never put a real identifier in a test — these files are tracked in a public repo, and the
  pre-commit scan would block the commit anyway.
- **Fixtures set `core.hooksPath` to a temp directory.** This machine installs the identity hooks
  globally, so a fixture repo inherits them and its commits are blocked by the author check unless
  the test points `core.hooksPath` somewhere else — or, in `test_hooks.py`, at the copy under test.
- **Tests never touch `~/.claude`, the real repo, or the network.** `pre-push` is therefore not
  covered: its first act is `gh api user`. Its author sweep and secret backstop stay manually
  verified.
- **A gate change needs a test that fails without it.** Mutate the code, watch the test fail, then
  restore — that is the only proof the test covers what its name claims.
- **A `--check` generator is itself coverage.** `catalog_sync.py` and `gen_roster.py` regenerate in
  CI and diff against the tree, so drift fails the build without a unit test.

## The CI contract
Every step is deterministic and read-only: no network, no writes back to the repo, `contents: read`.
`fetch-depth: 0` is required because `check-freshness.py` resolves `verified_against` against
`origin/main`.

A green branch is not a green `main`. Two PRs can each pass alone and conflict once merged — that
is how the roster drifted in #14. Re-run the gates on a tree that has both.
