---
name: <Display Name>
slug: <directory name inside the bucket — must match this repo's folder>
bucket: personal | freelance | poc
visibility: private
status: <active | paused | support | poc | live>
showcase: false
live_url:
repo_url: https://github.com/nmalick/<repo>
repo_public: false
stack: <comma-joined, e.g. Flutter, Dart, Firebase>
summary: <one line>
docs_status: baselined | partial | stale | none
docs_verified: <YYYY-MM-DD>
---

<One or two lines of context: what stage the project is at, what the PoC covers.>

## Why this file is here, not in the umbrella
The umbrella's `registry/` is world-readable, so an entry there would expose this project's name,
summary and repo URL whatever `visibility` says. A **private** project's entry therefore lives
with the project, and `scripts/collect-local-registry.py` in the umbrella copies it into the
gitignored `registry.local/`.

- Edit this file, never `registry.local/<slug>.md` — the next collect run overwrites the copy.
- `slug` must match this repo's folder name inside the bucket, or the collector refuses it.
- Keep `visibility: private` (and no `live_url` / `repo_public` / `showcase`). A
  publication-eligible entry is **refused** here: public entries belong in the umbrella's tracked
  `registry/`, which is what CI reads. Move it there when the project goes public.

Full field contract: `registry/README.md` in the umbrella.
