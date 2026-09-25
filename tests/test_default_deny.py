"""
Default-deny regression tests for the EMN_labOS catalog generator.

The linchpin invariant: a registry entry reaches a public surface ONLY when
  visibility ∈ {public, anonymized} AND (live_url OR repo_public OR showcase).
Every combination of the four gate dimensions is exercised; private entries must
appear in NO generated artifact, including the corpus (a second private→public route).
Also: allowlist proof (a junk field never propagates), freelance-mcps gate, and
shell-safety of repo_url. And the 2026-09 gate-soundness fixes: kit-derived content is
carried forward (never faked as "pre-baseline") when the project folder is absent, orphaned
index files are drift and get deleted, and the "as of" stamp does not depend on git history.

Run: python3 -m pytest tests/  (or python3 tests/test_default_deny.py)
"""
import itertools
import json
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import registry as R  # noqa: E402
import catalog_sync as C  # noqa: E402
import gen_manifest as M  # noqa: E402


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
    # Distinctive tokens: a common word as the slug would make a substring check meaningless.
    hidden = entry("private", True, True, True, name="HiddenProjZq", slug="hidden-slug-zq")
    shown = entry("public", True, False, False, name="ShownProj", slug="shown")
    arts = C.render_all([m for m in [hidden, shown] if R.is_public(m)], "2026-01-01")
    for path, content in arts.items():
        assert "HiddenProjZq" not in content, f"private name leaked into {path}"
        assert "hidden-slug-zq" not in content, f"private slug leaked into {path}"
        assert "hidden-slug-zq" not in path, f"private slug names an artifact: {path}"


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


def test_kit_unknown_is_carried_forward_not_faked():
    # Project folder absent (CI; gitignored bucket): committed kit content survives, and a
    # hand-added corpus key or a non-eligible slug's body never rides along.
    m = entry("public", True, False, False, name="Carried", slug="carried-zq")
    prior = {"asof": None,
             "index_body": {"carried-zq": "> cursor-zq\n\n| a | b | c |\n", "ghost-zq": "GHOST-BODY\n"},
             "doc_index": {"carried-zq": {"has_kit": True, "cursor": "cursor-zq", "junk": "MUST-NEVER-EMIT"}}}
    arts = C.render_all([m], "2026-01-01", prior)
    assert arts[C.index_path("carried-zq")].endswith(C.INDEX_INTRO + "\n\n> cursor-zq\n\n| a | b | c |\n")
    assert json.loads(arts[C.CORPUS])[0]["doc_index"] == {"has_kit": True, "cursor": "cursor-zq"}
    for path, content in arts.items():
        assert "GHOST-BODY" not in content and "MUST-NEVER-EMIT" not in content, path
    # Nothing ever committed for it -> the placeholder.
    assert C.NO_KIT in C.render_all([m], "2026-01-01")[C.index_path("carried-zq")]


def test_kit_on_disk_wins_over_committed():
    m = entry("public", True, False, False)
    prior = {"asof": None, "index_body": {"p": "STALE-BODY\n"},
             "doc_index": {"p": {"has_kit": True, "cursor": "stale"}}}
    orig = R.project_dir
    with tempfile.TemporaryDirectory() as d:
        R.project_dir = lambda _m: d
        try:
            # Folder present, no project-os: authoritatively "no kit" — the committed body goes.
            arts = C.render_all([m], "2026-01-01", prior)
            assert C.NO_KIT in arts[C.index_path("p")] and "STALE-BODY" not in arts[C.index_path("p")]
            assert json.loads(arts[C.CORPUS])[0]["doc_index"] == {"has_kit": False, "cursor": ""}
            os.makedirs(os.path.join(d, "project-os", "engineering"))
            with open(os.path.join(d, "project-os", "DIRECTORY.md"), "w") as f:
                f.write("| Doc | Contains | When |\n|---|---|---|\n| a.md | fresh-row | x |\n")
            with open(os.path.join(d, "project-os", "engineering", "architecture.md"), "w") as f:
                f.write("> **Last commit checked**: `abc1234`\n")
            idx = C.render_all([m], "2026-01-01", prior)[C.index_path("p")]
            assert "fresh-row" in idx and "abc1234" in idx and "STALE-BODY" not in idx
        finally:
            R.project_dir = orig


def test_orphan_index_is_drift_and_deleted():
    m = entry("public", True, False, False, slug="keep")
    with tempfile.TemporaryDirectory() as root:
        os.makedirs(os.path.join(root, "registry"))
        ghost = os.path.join(root, "registry", "gone-index.md")
        with open(ghost, "w") as f:
            f.write("# Gone — doc index (pointer)\n")
        arts = C.plan([m], C.load_prior(root), root, "2026-01-01")
        orphans = C.stale_indexes(arts, root)
        assert orphans == [C.index_path("gone")], orphans
        C.apply(arts, C.drifted(arts, root), orphans, root)
        assert not os.path.exists(ghost)
        assert os.path.isfile(os.path.join(root, C.index_path("keep")))
        assert not C.drifted(arts, root) and not C.stale_indexes(arts, root)


def test_asof_stamp_is_stable_and_git_free():
    # A later regen (or a squash-merge re-dating the commit) must not move the stamp;
    # only a change to a stamped surface does, and then to the generation date.
    m = entry("public", True, False, False)
    with tempfile.TemporaryDirectory() as root:
        arts = C.plan([m], C.load_prior(root), root, "2026-01-01")
        C.apply(arts, C.drifted(arts, root), [], root)
        arts = C.plan([m], C.load_prior(root), root, "2026-02-02")
        assert not C.drifted(arts, root), "unchanged content must keep its stamp"
        assert "2026-01-01" in arts[C.STAMP_FILE]
        changed = dict(m, summary="a new summary")
        arts = C.plan([changed], C.load_prior(root), root, "2026-03-03")
        for p in C.STAMPED:
            assert "2026-03-03" in arts[p] and "2026-01-01" not in arts[p], p


def test_local_registry_entry_cannot_publish():
    # registry.local/ is gitignored: CI never sees it, so a publication-eligible entry there
    # would make --check pass locally and fail in CI. validate() must reject it loudly.
    m = entry("public", True, False, False, name="LocalPub", slug="local-pub")
    m["_local"] = True
    errs = R.validate([m])
    assert any("registry.local" in e for e in errs), errs
    # A private local entry is fine, and stays out of every artifact.
    priv = entry("private", False, False, False, name="LocalPriv", slug="local-priv")
    priv["_local"] = True
    assert not R.validate([priv])
    assert not R.is_public(priv)
    arts = C.render_all([m for m in [priv] if R.is_public(m)], "2026-01-01")
    for path, content in arts.items():
        assert "LocalPriv" not in content and "local-priv" not in content, path


def test_loader_skips_non_entry_files():
    import tempfile, os as _os
    with tempfile.TemporaryDirectory() as d:
        reg, loc = _os.path.join(d, "registry"), _os.path.join(d, "registry.local")
        _os.makedirs(reg); _os.makedirs(loc)
        for name in ("README.md", "ai-ops-prose.md", "x-index.md"):
            open(_os.path.join(reg, name), "w").write("no frontmatter here\n")
        open(_os.path.join(reg, "real.md"), "w").write(
            "---\nname: Real\nslug: real\nbucket: personal\nvisibility: public\n"
            "status: active\nsummary: s\nshowcase: true\n---\n")
        open(_os.path.join(loc, "hidden.md"), "w").write(
            "---\nname: Hidden\nslug: hidden-zq\nbucket: poc\nvisibility: private\n"
            "status: poc\nsummary: s\n---\n")
        orig_reg, orig_loc = R.REG, R.REG_LOCAL
        R.REG, R.REG_LOCAL = reg, loc
        try:
            entries, errors = R.load()
        finally:
            R.REG, R.REG_LOCAL = orig_reg, orig_loc
    assert not errors, errors
    assert sorted(m["slug"] for m in entries) == ["hidden-zq", "real"]
    assert {m["slug"]: m["_local"] for m in entries} == {"real": False, "hidden-zq": True}


def test_manifest_never_clones_the_umbrella_into_itself():
    # The umbrella catalogues itself, so gen_manifest must recognise its own remote in any form
    # and skip it — otherwise bootstrap clones this repo into personal-projects/.
    own = "https://github.com/nmalick/EMN_labOS.git"
    for variant in (own, "https://github.com/nmalick/EMN_labOS",
                    "git@github.com:nmalick/EMN_labOS.git", "HTTPS://GitHub.com/nmalick/EMN_labOS/"):
        assert M.norm_repo(variant) == M.norm_repo(own), variant
    assert M.norm_repo("https://github.com/nmalick/Qari.git") != M.norm_repo(own)


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
