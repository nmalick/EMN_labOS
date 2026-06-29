# Agent prune list (flagged, not yet pruned)

All 19 agents + 6 commands were ported and genericized into this self-contained `.claude/`.
The full team-design pipeline is overkill for a solo developer. Prune **one at a time** later,
verifying nothing breaks between removals.

## Keepers (do not prune)
- `researcher` — cross-cutting research, broadly useful
- `qa` — quality/accessibility review (folds in a11y)
- `backend-eng`, `frontend-eng` — actual build work
- `project-manager` — milestone status + GitHub issues (notifications now channel-agnostic)

## Flagged for later one-at-a-time pruning (heavy team-design pipeline)
- `concept-validator`, `tech-feasibility` — validation gate
- `council` — 4-sage approval vote
- `pm` — spec writer
- `user-researcher`, `info-architect`, `interaction-designer`, `mock-prompter`,
  `brand-designer`, `designer` — full design pipeline
- `sprint-planner`, `iteration-reviewer` — sprint mechanics
- `surveyor`, `data-analyst` — user-research data path

## Commands tied to the pipeline (review alongside agents)
- `new-feature`, `pre-sprint`, `sprint-status`, `backlog`, `retro`, `ship-check`

_Rationale: keep the build + research + QA spine; shed the multi-agent ceremony as it proves unused._
