---
name: new-project
description: Scaffold a new project from templates/doc-kit — project-os folders, thin root CLAUDE.md router, .claude/ settings, and a registry entry. Does not create a remote, touch the clone list, or run catalog-sync.
disable-model-invocation: true
argument-hint: "<slug> [--bucket personal|freelance|poc] [--visibility private|anonymized|public]"
---

# /new-project <slug>

1. Refuse if `registry/<slug>.md` already exists or the bucket dir already has the slug.
2. Copy `templates/doc-kit/project-os/` skeleton into the project; write the root `CLAUDE.md`
   router (art variant keeps `@AGENTS.md` line 1 if a vendor file exists) and `.claude/settings.json`
   (category allows + secrets denies + `Read` deny on the other identity's tree, machine-local).
3. `.gitignore`: `.claude/*` + `!.claude/settings.json`.
4. Write the registry entry (flat scalars; `showcase`/`live_url`/`repo_public` per the flags).
   **Where it goes depends on visibility:** `--visibility private` → `project-os/registry-entry.md`
   inside the project (copy `templates/doc-kit/project-os/registry-entry.template.md`), collected
   into the gitignored `registry.local/` by `scripts/collect-local-registry.py`. Anything else →
   `registry/<slug>.md` in the umbrella. Either way it is the ONLY hand-authored registry file;
   the `<slug>-index.md` is generated.
5. Stub each empty kit folder's README with the honest negative assertion + frontmatter.
6. Report what to do next — do NOT do them:
   - create the remote
   - **add a row to `clone-list.tsv` in the private config repo** (`<url>⇥<bucket-dir>⇥<slug>`),
     or the project will not clone on a fresh machine; verify with `scripts/check_clone_list.py`
   - first baseline via `/baseline-audit <slug>`
   - `/catalog-sync`
