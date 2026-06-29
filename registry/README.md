# registry/

Source of truth for the project catalog. One `<project>.md` per project with frontmatter:

```yaml
---
name: <display name>
bucket: personal | freelance | poc
visibility: public | anonymized | private
status: <e.g. active, paused, shipped>
live_url: <url or empty>
repo_url: <url>
stack: [<...>]
summary: <one line>
---
```

`/catalog-sync` reads these and emits the generated catalog. **Default-deny:** unset/`private`
visibility or empty `live_url` → omitted from every public surface.

_Stubs populated in Phase 6._
