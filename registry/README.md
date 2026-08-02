# registry/

Source of truth for the project catalog. One `<project>.md` per project with frontmatter:

```yaml
---
name: <display name>
slug: <directory name inside the bucket>
bucket: personal | freelance | poc
visibility: public | anonymized | private
status: <e.g. active, paused, shipped>
live_url: <url or empty>
repo_url: <url or empty>
repo_public: true | false
stack: <comma-separated, e.g. Next.js, TypeScript, Vercel>
summary: <one line>
---
```

`/catalog-sync` reads these and emits the generated catalog. **Default-deny:** unset/`private`
visibility or empty `live_url` → omitted from every public surface.

`slug` is the on-disk directory name and is carried into `projects.json`. `repo_public` only ever
surfaces a repo link for a project that already passes default-deny — it is not itself a gate.
`repo_url` is read separately by `scripts/gen_manifest.py`, which emits a clone line for **every**
entry that has one regardless of visibility; leave it empty for a repo that must not appear in the
tracked `manifest.sh` and put its clone line in the gitignored `manifest.local.sh` instead.
