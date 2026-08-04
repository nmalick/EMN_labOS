---
name: new-project
description: Scaffold a new project from templates/doc-kit — project-os folders, thin root CLAUDE.md router, .claude/ settings, a registry entry, and a manifest line. Does not create a remote or run catalog-sync.
disable-model-invocation: true
argument-hint: "<slug> [--bucket personal|freelance|poc] [--visibility private|anonymized|public]"
---

# /new-project <slug>

1. Refuse if `registry/<slug>.md` already exists or the bucket dir already has the slug.
2. Copy `templates/doc-kit/project-os/` skeleton into the project; write the root `CLAUDE.md`
   router (art variant keeps `@AGENTS.md` line 1 if a vendor file exists) and `.claude/settings.json`
   (category allows + secrets denies + `Read` deny on the other identity's tree, machine-local).
3. `.gitignore`: `.claude/*` + `!.claude/settings.json`.
4. Write `registry/<slug>.md` frontmatter (flat scalars; `showcase`/`live_url`/`repo_public` per
   the flags) — this is the ONLY hand-authored registry file; the `<slug>-index.md` is generated.
5. Stub each empty kit folder's README with the honest negative assertion + frontmatter.
6. Report what to do next (create remote, first baseline via `/baseline-audit <slug>`,
   `/catalog-sync`) — do NOT do them.
