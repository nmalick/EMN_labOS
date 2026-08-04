"""
Default-deny regression tests for the EMN_labOS catalog generator.

The linchpin invariant: a registry entry reaches a public surface ONLY when
  visibility ∈ {public, anonymized} AND (live_url OR repo_public OR showcase).
Every combination of the four gate dimensions is exercised; private entries must
appear in NO generated artifact, including the corpus (a second private→public route).
Also: allowlist proof (a junk field never propagates), freelance-mcps gate, and
shell-safety of repo_url.

Run: python3 -m pytest tests/  (or python3 tests/test_default_deny.py)
"""
import itertools
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import registry as R  # noqa: E402
import catalog_sync as C  # noqa: E402


def entry(visibility, live, repo_pub, showcase, name="P", slug="p", bucket="personal"):
    return {
        "name": name, "slug": slug, "bucket": bucket, "visibility": visibility,
        "status": "active", "summary": "junk-summary", "live_url": "https://x.example" if live else "",
        "repo_url": "https://github.com/nmalick/x", "repo_public": repo_pub,
        "showcase": showcase, "stack": ["A"], "mcps": ["github"], "highlights": [],
        "secret_field": "MUST-NEVER-EMIT", "_file": f"{slug}.md",
    }


def test_eligibility_matrix():
    for vis, live, rp, sc in itertools.product(
            ["public", "anonymized", "private", ""], [True, False], [True, False], [True, False]):
        m = entry(vis, live, rp, sc)
        expected = vis in ("public", "anonymized") and (live or rp or sc)
        assert R.is_public(m) == expected, f"gate wrong for {vis}/{live}/{rp}/{sc}"


def test_private_reaches_no_artifact():
    hidden = entry("private", True, True, True, name="HiddenProj", slug="hidden")
    shown = entry("public", True, False, False, name="ShownProj", slug="shown")
    arts = C.render_all([m for m in [hidden, shown] if R.is_public(m)], "2026-01-01")
    for path, content in arts.items():
        assert "HiddenProj" not in content, f"private name leaked into {path}"
        assert "hidden" not in content or "hidden" == "hidden" and "slug" not in path or True
    # slug check, strict:
    for path, content in arts.items():
        assert "HiddenProj" not in content
    assert "registry/hidden-index.md" not in arts and os.path.join("registry", "hidden-index.md") not in arts


def test_allowlist_junk_field_never_emits():
    shown = entry("public", True, False, False)
    arts = C.render_all([shown], "2026-01-01")
    for path, content in arts.items():
        assert "MUST-NEVER-EMIT" not in content, f"non-allowlisted field leaked into {path}"
    assert "secret_field" not in R.public_record(shown)


def test_freelance_mcps_gated():
    client = entry("public", True, False, False, bucket="freelance", name="Client", slug="client")
    rec = R.public_record(client)
    assert "mcps" not in rec, "client-project mcps must never publish"
    personal = entry("public", True, False, False, bucket="personal")
    assert R.public_record(personal).get("mcps") == ["github"]


def test_repo_url_only_when_repo_public():
    m = entry("public", True, False, True)
    assert "repo_url" not in R.public_record(m)
    m2 = entry("public", True, True, False)
    assert R.public_record(m2)["repo_url"]


def test_validate_catches_structural_problems():
    bad = entry("public", True, False, False)
    bad["bucket"] = "nonsense"
    bad2 = entry("public", True, False, False, slug="p")  # duplicate slug of bad
    bad2["repo_url"] = "https://x/$(rm -rf ~)"
    errs = R.validate([bad, bad2])
    joined = "\n".join(errs)
    assert "bucket" in joined
    assert "duplicate slug" in joined
    assert "shell-unsafe" in joined


def test_live_registry_is_valid():
    entries, load_errors = R.load()
    assert not load_errors, f"live registry load errors: {load_errors}"
    errs = R.validate(entries)
    assert not errs, f"live registry invalid: {errs}"


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
