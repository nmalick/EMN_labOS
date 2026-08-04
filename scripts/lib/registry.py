"""
registry — shared loader/validator for EMN_labOS registry frontmatter.

Single source of truth for: ROOT resolution, frontmatter parsing, eligibility
rules, and validation. Consumed by catalog_sync.py, gen_manifest.py, and tests.

Design rules (2026-08 rebuild):
- ROOT is defined HERE, once. Importers must not recompute it (depth-sensitive).
- Frontmatter values are FLAT SCALARS ONLY. YAML lists are not supported by this
  parser (they silently parse to '') — list-shaped fields are comma-joined strings
  (`stack`, `mcps`, `highlights`).
- validate() is loud: structural problems are returned as errors and the CLI
  entrypoints exit non-zero. Silent entry loss is the failure mode this replaces.
"""
import glob
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REG = os.path.join(ROOT, "registry")

PUBLIC_VIS = {"public", "anonymized"}
BUCKETS = {"personal", "freelance", "poc"}
BUCKET_DIR = {"personal": "personal-projects", "freelance": "freelance-projects", "poc": "pocs"}
REQUIRED_KEYS = ["name", "slug", "bucket", "visibility", "status", "summary"]
# Fields allowed to reach ANY public surface. repo_url joins per-record only when
# repo_public; mcps joins only when bucket != freelance (client tooling stays private).
PUBLIC_FIELDS = ["name", "slug", "bucket", "status", "stack", "live_url", "summary", "highlights"]
LIST_FIELDS = ("stack", "mcps", "highlights")
# repo_url is interpolated into manifest.sh, which bootstrap.sh SOURCES — restrict
# to shell-inert characters.
REPO_URL_RE = re.compile(r"^[A-Za-z0-9@:/._+~-]*$")


def parse_frontmatter(path):
    """Parse flat-scalar YAML frontmatter. Returns (meta|None, error|None)."""
    with open(path, encoding="utf-8-sig") as f:  # -sig: BOM never silently kills an entry
        text = f.read()
    if not text.startswith("---"):
        return None, "no frontmatter block (must start with ---)"
    body = text.split("---", 2)
    if len(body) < 3:
        return None, "unterminated frontmatter block"
    meta = {}
    for line in body[1].strip().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("- "):
            return None, f"YAML list item found ({stripped!r}) — this parser is flat-scalar only; comma-join instead"
        if ":" not in line:
            continue
        k, _, v = line.partition(":")
        meta[k.strip()] = v.strip().strip('"').strip("'")
    for lf in LIST_FIELDS:
        raw = meta.get(lf, "")
        meta[lf] = [s.strip() for s in raw.split(",") if s.strip()]
    for bf in ("repo_public", "showcase"):
        meta[bf] = str(meta.get(bf, "")).lower() == "true"
    return meta, None


def load():
    """Load all registry entries. Returns (entries, errors)."""
    entries, errors = [], []
    for p in sorted(glob.glob(os.path.join(REG, "*.md"))):
        base = os.path.basename(p)
        if base.lower() == "readme.md" or base.endswith("-index.md") or base == "ai-ops-prose.md":
            continue
        meta, err = parse_frontmatter(p)
        if err:
            errors.append(f"{base}: {err}")
            continue
        if meta is None:
            errors.append(f"{base}: unparsable")
            continue
        meta["_file"] = base
        entries.append(meta)
    return entries, errors


def validate(entries):
    """Structural validation. Returns list of error strings (empty = valid)."""
    errors = []
    seen_slug, seen_name = {}, {}
    for m in entries:
        f = m.get("_file", "?")
        for k in REQUIRED_KEYS:
            if not str(m.get(k, "")).strip():
                errors.append(f"{f}: missing required key '{k}'")
        b = m.get("bucket", "")
        if b and b not in BUCKETS:
            errors.append(f"{f}: bucket '{b}' not in {sorted(BUCKETS)}")
        v = m.get("visibility", "")
        if v and v not in PUBLIC_VIS | {"private"}:
            errors.append(f"{f}: visibility '{v}' not in public|anonymized|private")
        slug = m.get("slug", "")
        if slug in seen_slug:
            errors.append(f"{f}: duplicate slug '{slug}' (also in {seen_slug[slug]})")
        seen_slug.setdefault(slug, f)
        name = m.get("name", "")
        if name in seen_name:
            errors.append(f"{f}: duplicate name '{name}' (also in {seen_name[name]})")
        seen_name.setdefault(name, f)
        url = (m.get("repo_url") or "").strip()
        if url and not REPO_URL_RE.match(url):
            errors.append(f"{f}: repo_url contains shell-unsafe characters: {url!r}")
        lu = (m.get("live_url") or "").strip()
        if lu and not lu.startswith(("http://", "https://")):
            errors.append(f"{f}: live_url must be http(s): {lu!r}")
    return errors


def is_public(m):
    """Showcase-eligibility gate (2026-08 extension): visible AND (live OR public-repo OR showcase)."""
    if m.get("visibility", "") not in PUBLIC_VIS:
        return False
    return bool((m.get("live_url") or "").strip()) or m.get("repo_public") or m.get("showcase")


def omit_reason(m):
    why = []
    if m.get("visibility", "") not in PUBLIC_VIS:
        why.append(f"visibility={m.get('visibility','') or 'unset'}")
    if not ((m.get("live_url") or "").strip() or m.get("repo_public") or m.get("showcase")):
        why.append("no live_url / repo_public / showcase")
    return ", ".join(why)


def public_record(m):
    """The ONLY path from a registry entry to a public surface. Allowlist, never copy."""
    rec = {k: m.get(k, "") for k in PUBLIC_FIELDS}
    if m.get("showcase"):
        rec["showcase"] = True
    if m.get("repo_public"):
        rec["repo_url"] = m.get("repo_url", "")
    if m.get("bucket") != "freelance" and m.get("mcps"):
        rec["mcps"] = m.get("mcps")
    return rec


def project_dir(m):
    d = BUCKET_DIR.get(m.get("bucket", ""), "")
    return os.path.join(ROOT, d, m.get("slug", "")) if d else ""
