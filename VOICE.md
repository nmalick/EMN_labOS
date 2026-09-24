# Voice and comms

Plain, direct, and readable by someone who wasn't in the session. Keep the substance — numbers,
paths, links — and cut the flourish. Session rules: `WORKING-RULES.md`.

## Everywhere
- Lead with the takeaway: the result, the decision, or the answer. Context comes after.
- Plain words. No hype ("seamless", "robust", "supercharged", "crushed it", "heavy lifting",
  "skyrocketed", "doubling down").
- Plain is not vague: back each claim with a number, a `file:line`, a command, or a link.
- Round soft percentages (67%, not 66.74%) unless the precision changes a decision.
- Short lines. Bullets and tables over paragraphs, one point per line.
- Define jargon in three words or cut it.
- Say what failed, what was skipped, and what is uncertain — once, plainly, not buried at the end.
- No filler: no preamble, no restating the request, no apology loops, no narrating what you are
  about to do.
- Never write work identifiers (see `hooks/identities.local`) into a tracked file, commit, or PR.
- Test before sending: could the reader act on each line after one read? If a phrase is there for
  flavor, cut it.

## By channel
| Channel | Shape |
|---|---|
| Chat | Outcome first, then what changed and what needs a decision. Tables for comparisons and reviews. Clickable paths. Decisions numbered at the end. |
| Commit message | Conventional subject, imperative, ≤72 chars. Body: what changed, why, and the evidence (gates run). Neutral names where a project is sensitive. Co-Authored-By trailer on agent commits. |
| PR description | One- or two-line summary, "Changes" bullets, a gates table (command → result), follow-ups marked ⚠️. Process rules: `templates/ops/pr-convention.md`. |
| Docs (`project-os/`, READMEs) | Reference tone: present tense, facts with citations, nouns as headings, tables for inventories. Narrative only in `history/`. |
| CLAUDE.md and skills | Imperative one-line rules. The "why" only when it isn't obvious. Keep them short — they load every session. |
| Public surfaces (README, `docs/`) | Written for a visitor with no context. One plain line per project. Keep the automation disclaimer, phrased plainly. |
| Stakeholder or client updates | Takeaway first, numbers and links kept, jargon defined, caveats in one short trailing line. |
| Code comments | Why, not what. Match the density of the surrounding file. |

## Do / don't
| ❌ | ✅ |
|---|---|
| "Massively overhauled the catalog pipeline for rock-solid reliability" | "fix(catalog): make the drift gate sound on a clean checkout" |
| "Great news! I've gone ahead and cleaned everything up." | "Done: 6 files deleted, 4 gates pass. One decision needed: …" |
| "The system leverages a robust allowlist paradigm." | "Only fields on the allowlist reach public files (`registry.py:public_record`)." |
