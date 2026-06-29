> **Invoke:** `/catalog-sync`
>
> **Purpose:** Regenerate the public project catalog from `registry/*.md`.

---
description: Regenerate projects.json + README/STATUS/ROADMAP/RELEASE-NOTES + docs/index.html
  from registry/*.md. Default-deny — only public/anonymized projects with a live_url are shown.
---

## What it does
`registry/<project>.md` frontmatter is the **single source of truth**. The catalog is **generated,
never hand-edited** — so a private project can't be named in hand-written prose.

**Default-deny filter:** a project reaches public surfaces only if
`visibility ∈ {public, anonymized}` AND `live_url` is non-empty. Everything else is omitted.
Private/freelance entries stay hidden until they have a live URL.

## Run
```bash
python3 scripts/catalog_sync.py
```
Review the printed `SHOWN / OMITTED (why)` summary. Then commit the regenerated files with a
**neutral message** (no project/client names in the log).

## Adding / updating a project
Edit or add `registry/<slug>.md` frontmatter (`name, slug, bucket, visibility, status, live_url,
repo_url, repo_public, stack, summary`), then re-run. Never edit the generated files directly.
