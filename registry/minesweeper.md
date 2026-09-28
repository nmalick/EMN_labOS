---
name: Minesweeper
slug: minesweeper
bucket: poc
visibility: public
status: live
live_url: https://minesweeper.emnlabs.io
repo_url: https://github.com/nmalick/minesweeper
repo_public: false
stack: HTML, CSS, vanilla JavaScript, Vercel
summary: Classic Minesweeper as one self-contained page — no build step, no dependencies.
highlights: Engine gated by 1010 assertions in CI, Chording and full keyboard play, Light and dark themes
docs_status: none
docs_verified: 2026-09-28
---

POC. Published on `live_url` alone — no `showcase` needed. The repo stays private
(`repo_public: false`), so no repo link is emitted.

No `project-os/` kit by design: a single-file game with no architecture to document beyond its
README. The generated `minesweeper-index.md` therefore carries the honest no-kit placeholder.
