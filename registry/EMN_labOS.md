---
name: EMN_labOS
slug: EMN_labOS
bucket: personal
visibility: public
status: active
showcase: true
live_url: https://nmalick.github.io/EMN_labOS/
repo_url: https://github.com/nmalick/EMN_labOS
repo_public: true
stack: Python, Bash, GitHub Actions
summary: The umbrella OS itself — registry-driven public catalog, identity-wall git hooks, and one-command machine replication.
---

This repo, catalogued like any other project: it is the showcase artifact, not just the thing that
builds the showcase. Its docs are the repo itself (`CLAUDE.md`, `DIRECTORY.md`), so it has no
`project-os/` kit and its generated index stays a placeholder.

It lives in no bucket folder. `gen_manifest.py` skips any entry whose `repo_url` matches this
repo's own remote, so bootstrap never clones the umbrella into `personal-projects/`.
