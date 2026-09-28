"""
Regression tests for the identity wall (hooks/pre-commit).

The wall is the repo's load-bearing guard and had no automated coverage: a refactor that broke
a check would look exactly like a clean commit. Each test drives the real hook against a
throwaway repo whose `core.hooksPath` points at a copy of it.

Every identifier here is SYNTHETIC — example.test addresses, made-up token strings. The real ones
live in the gitignored hooks/identities.local and must never appear in a tracked file, this one
included.

Not covered here: `pre-push`. Its first act is `gh api user`, so it needs network and an
authenticated CLI; CI has neither. Its author sweep and secret backstop stay manually verified.

Run: python3 tests/test_hooks.py
"""
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
HOOK = os.path.join(HERE, "..", "hooks", "pre-commit")

IDENTITIES = """\
WORK_EMAIL="work@example.test"
WORK_GH="workacct"
WORK_NOREPLY="1+workacct@users.noreply.github.com"
PERSONAL_EMAIL="me@example.test"
PERSONAL_GH="meacct"
PERSONAL_NOREPLY="2+meacct@users.noreply.github.com"
WORK_MATCH_RE="never-matches-xyzzy"
SECRET_RE_COMMON="FAKE_SECRET_[A-Z0-9]{8}"
PERSONAL_EXTRA_RE="ANOTHER_FAKE_[0-9]{4}"
LABOS_ROOT_RE="{labos_root_re}"
LABOS_COMMIT_TOKENS="forbidden-token-xyzzy"
"""


def git(repo, *args, check=True):
    r = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True)
    if check:
        assert r.returncode == 0, f"git {' '.join(args)}: {r.stderr.strip()}"
    return r


def wall(labos_repo=False, identities=True):
    """A throwaway repo guarded by a copy of the real pre-commit hook."""
    base = tempfile.mkdtemp()
    hooks, repo = os.path.join(base, "hooks"), os.path.join(base, "repo")
    os.makedirs(hooks)
    os.makedirs(repo)
    shutil.copy(HOOK, hooks)
    if identities:
        # LABOS_ROOT_RE decides whether the public-surface token scan runs at all.
        with open(os.path.join(hooks, "identities.local"), "w") as f:
            f.write(IDENTITIES.replace("{labos_root_re}", repo if labos_repo else "never-matches-xyzzy"))
    git(repo, "init", "-q", "-b", "main")
    git(repo, "config", "user.email", "me@example.test")
    git(repo, "config", "user.name", "Me")
    git(repo, "config", "core.hooksPath", hooks)
    return repo


def commit(repo, name, content, msg="t", force=False):
    """Stage one file and commit. Returns (exit code, stderr)."""
    path = os.path.join(repo, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
    git(repo, "add", *(["-f"] if force else []), name)
    r = git(repo, "-c", "commit.gpgsign=false", "commit", "-m", msg, check=False)
    return r.returncode, r.stderr


def test_clean_commit_passes():
    rc, err = commit(wall(), "a.txt", "hello\n")
    assert rc == 0, err


def test_wrong_author_blocked():
    repo = wall()
    git(repo, "config", "user.email", "someone-else@example.test")
    rc, err = commit(repo, "a.txt", "hello\n")
    assert rc != 0 and "user.email" in err, err


def test_secret_shaped_content_blocked():
    rc, err = commit(wall(), "b.txt", "key = FAKE_SECRET_ABCD1234\n")
    assert rc != 0 and "secret-shaped content" in err, err


def test_staging_the_identity_file_blocked():
    # It is gitignored in the real repo; -f proves the hook blocks it even when staged deliberately.
    rc, err = commit(wall(), "hooks/identities.local", "WORK_EMAIL=x\n", force=True)
    assert rc != 0 and "machine-local by design" in err, err


def test_public_surface_token_blocked_in_this_repo():
    rc, err = commit(wall(labos_repo=True), "c.txt", "mentions forbidden-token-xyzzy here\n")
    assert rc != 0 and "token in staged blob" in err, err


def test_token_scan_does_not_run_outside_this_repo():
    # Another repo may legitimately contain the same word; the scan is scoped by LABOS_ROOT_RE.
    rc, err = commit(wall(labos_repo=False), "c.txt", "mentions forbidden-token-xyzzy here\n")
    assert rc == 0, err


def test_labos_allow_exempts_a_path():
    repo = wall(labos_repo=True)
    with open(os.path.join(repo, ".labos-allow"), "w") as f:
        f.write("c.txt\n")
    git(repo, "add", ".labos-allow")
    rc, err = commit(repo, "c.txt", "mentions forbidden-token-xyzzy here\n")
    assert rc == 0, err


def test_missing_identity_file_fails_closed():
    rc, err = commit(wall(identities=False), "a.txt", "hello\n")
    assert rc != 0 and "identity wall cannot run" in err, err


if __name__ == "__main__":
    fails = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"  ✓ {name}")
            except AssertionError as e:
                print(f"  ✗ {name}: {e}")
                fails += 1
    sys.exit(1 if fails else 0)
