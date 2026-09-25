# registry/ — the catalog's source of truth

One file per project. `/catalog-sync` generates every public surface from these files; nothing
here is hand-edited except the entries themselves and `ai-ops-prose.md`.

## Rules
- **Every `.md` here is parsed as a project entry**, except `README.md`, `CLAUDE.md`,
  `ai-ops-prose.md` and `*-index.md`. A stray file fails `catalog_sync` and `gen_manifest` with a
  non-zero exit, which turns CI red. Put notes in `README.md`, not in a new file.
- **Private projects go in `registry.local/`** (gitignored), never here. This folder is
  world-readable, so an entry describes the project — name, summary, stack, repo URL — even when
  `visibility: private` keeps it out of the generated surfaces. An entry in `registry.local/` that
  would publish is a validation error.
- **Frontmatter is flat scalars only.** Lists are comma-joined strings; the parser rejects YAML
  lists loudly.
- **After any edit, run `/catalog-sync`** and commit the entry and the regenerated files together.
  CI's `--check` fails otherwise.
- `<slug>-index.md` files are generated pointers. Never hand-edit them; an orphan is deleted on
  the next run.

The full contract — every field, the publication gate, the manifest policy — is in
[README.md](README.md).
