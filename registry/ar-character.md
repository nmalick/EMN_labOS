---
name: AR Character
slug: ar-character
bucket: poc
visibility: public
status: poc
live_url: https://archaracter.emnlabs.io
repo_url: https://github.com/nmalick/ar-character
repo_public: false
stack: three.js, WebXR, vanilla JavaScript, Vercel
summary: An animated character composited into your surroundings through the phone camera — three modes, no build step.
highlights: Stage and Road run on iPhone, Parkour timing decoupled from a 12 Hz detector, three.js vendored with zero runtime network calls
docs_status: baselined
docs_verified: 2026-09-28
---

POC. Published on `live_url` alone — no `showcase` needed. The repo stays private
(`repo_public: false`), so no repo link is emitted.

Extracted from this repo's own `pocs/ar-character` (an unmerged branch) in 2026-09, which had
carved an exception into the deny-all `.gitignore` to track a project inside the public umbrella.
Its own repo removed the exception and fixed a Vercel root-directory misconfiguration that had
failed all 15 of its deployments.
