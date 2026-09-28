"""
Regression tests for the deterministic doc-freshness gate (scripts/check-freshness.py).

The gate's findings drive real work, so each failure mode must name the right fix:
  - TTL_STALE     — last_verified + ttl_days is in the past          → re-verify
  - SOURCE_MISSING— a cited path no longer exists                    → fix the citation
  - STALE_BASE    — verified_against exists, not an ancestor of main  → re-verify
  - UNKNOWN_BASE  — verified_against is not in this clone at all      → fetch, or the branch was
                    squash-merged and deleted (this repo squash-merges, so it happens)
STALE_BASE and UNKNOWN_BASE were one finding until 2026-09; a missing commit reported as
"not an ancestor" sends you re-verifying a doc when the real problem is the clone.

Run: python3 tests/test_freshness.py
"""
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "..", "scripts", "check-freshness.py")


def git(repo, *args):
    r = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True)
    assert r.returncode == 0, f"git {' '.join(args)} failed: {r.stderr.strip()}"
    return r.stdout.strip()


def fixture(doc_frontmatter):
    """A throwaway repo with origin/main, one source file, and one doc carrying the frontmatter."""
    d = tempfile.mkdtemp()
    git(d, "init", "-q", "-b", "main")
    git(d, "config", "user.email", "t@example.com")
    git(d, "config", "user.name", "T")
    # The machine's global core.hooksPath points at the umbrella's identity hooks, which block
    # any commit whose author is not the owner. This fixture is a throwaway repo, not labOS.
    git(d, "config", "core.hooksPath", "/dev/null")
    open(os.path.join(d, "src.py"), "w").write("print(1)\n")
    os.makedirs(os.path.join(d, "docs"))
    open(os.path.join(d, "docs", "doc.md"), "w").write(doc_frontmatter)
    git(d, "add", "-A")
    git(d, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "init")
    sha = git(d, "rev-parse", "HEAD")
    git(d, "update-ref", "refs/remotes/origin/main", sha)
    return d, sha


def set_base(repo, sha):
    """Substitute the real HEAD sha into the doc's verified_against placeholder."""
    doc = os.path.join(repo, "docs", "doc.md")
    text = open(doc).read()          # read BEFORE opening for write — "w" truncates
    open(doc, "w").write(text.replace("PLACEHOLDER", sha))


def run_gate(repo):
    r = subprocess.run([sys.executable, SCRIPT, "--root", os.path.join(repo, "docs"), "--repo", repo],
                       capture_output=True, text=True)
    return r.returncode, r.stdout


def test_clean_doc_passes():
    d, sha = fixture("---\nlast_verified: 2099-01-01\nttl_days: 90\n"
                     "verified_against: PLACEHOLDER\nsources: src.py:1\n---\n\nbody\n")
    set_base(d, sha)
    rc, out = run_gate(d)
    assert rc == 0, out
    assert "1 tracked doc(s)" in out and "0 finding(s)" in out, out


def test_unknown_base_is_not_reported_as_stale():
    # A SHA that is not in this clone at all — git exits 128, not 1.
    d, _ = fixture("---\nlast_verified: 2099-01-01\nttl_days: 90\n"
                   "verified_against: deadbeefdeadbeef\nsources: src.py:1\n---\n\nbody\n")
    rc, out = run_gate(d)
    assert rc == 1, out
    assert "UNKNOWN_BASE" in out, out
    assert "STALE_BASE" not in out, out
    assert "not in this clone" in out, out


def test_stale_base_still_reported():
    # A real commit that is not an ancestor of origin/main — git exits 1.
    d, sha = fixture("---\nlast_verified: 2099-01-01\nttl_days: 90\n"
                     "verified_against: PLACEHOLDER\nsources: src.py:1\n---\n\nbody\n")
    open(os.path.join(d, "other.txt"), "w").write("x\n")
    git(d, "add", "-A")
    git(d, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "off-main")
    off = git(d, "rev-parse", "HEAD")           # a commit origin/main does not contain
    git(d, "update-ref", "refs/remotes/origin/main", sha)
    set_base(d, off)
    rc, out = run_gate(d)
    assert rc == 1, out
    assert "STALE_BASE" in out and "UNKNOWN_BASE" not in out, out


def test_ttl_and_citation_rot():
    d, sha = fixture("---\nlast_verified: 2020-01-01\nttl_days: 30\n"
                     "verified_against: PLACEHOLDER\nsources: src.py:1, gone.py:9\n---\n\nbody\n")
    set_base(d, sha)
    rc, out = run_gate(d)
    assert rc == 1, out
    assert "TTL_STALE" in out and "SOURCE_MISSING" in out, out


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
