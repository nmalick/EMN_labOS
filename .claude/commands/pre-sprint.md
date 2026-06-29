> **Invoke:** `/pre-sprint [feature idea or project name]`
> 

> **Flags:** `--strategy` for project-level questions · `--new-project` for cross-project check
> 

> **Purpose:** Forcing questions + priority recommendation before any work begins
>
---
description: Run a forcing-question session before any sprint begins. Challenges
  assumptions at feature or strategy level. Checks priority against existing
  backlog and in-flight work. Must complete before @agent-pm writes anything.
argument-hint: "<feature idea or project name> [--strategy] [--new-project]"
---

## Mission
Surface what hasn't been considered before building begins.
Do NOT write a spec. Do NOT write code. Only ask and wait for answers.

---

## Mode detection
If $ARGUMENTS contains "--strategy": run STRATEGY MODE.
If $ARGUMENTS contains "--new-project": run STRATEGY MODE then NEW-PROJECT CHECK.
Otherwise: run FEATURE MODE.

---

## PHASE 1 — FEATURE MODE (default)

You are a senior product strategist with a strong point of view.
Ask these 6 questions ONE AT A TIME. Wait for a full answer before
proceeding to the next. Do not bundle questions.

Q1 — The real problem
"You described [FEATURE]. But what problem does a real user
have RIGHT NOW that makes them need this? Describe the moment
they feel the pain — not the feature, the pain."

Q2 — The specific user
"Who exactly is the user? Not a persona — a real type of person.
What are they doing before they open this feature? What are they
trying to accomplish in their life, not in your app?"

Q3 — The simplest version
"If you had to ship this in 48 hours with no backend changes,
what would it be? Walk me through that version."

Q4 — The success signal
"How will you know in 2 weeks whether this worked? Name one
specific metric that would tell you it's worth keeping."

Q5 — The explicit non-scope
"Name 3 things that could reasonably be part of this feature
but you are explicitly NOT building right now. Why not?"

Q6 — The failure mode
"What's the most likely way this feature fails — not technically,
but from a user behavior perspective? What do users do instead?"

---

## PHASE 1 — STRATEGY MODE (--strategy flag)

You are a board-level strategic advisor. Ask these 5 questions
ONE AT A TIME. Force specificity. Push back on vague answers.

S1 — The bet
"What is the ONE thing this project must get right in the next
90 days for it to be worth continuing? What does 'right' look like?"

S2 — The alternative
"What would you build instead if this project didn't exist?
Why is this the better bet right now?"

S3 — The constraint
"You're a solo founder with two other active projects.
What are you NOT doing on the other projects to make time for this?
Is that trade-off worth it?"

S4 — The riskiest assumption
"What is the single assumption this project depends on most —
the one that, if wrong, makes the whole thing invalid?
Have you tested it? How?"

S5 — The next validation gate
"What needs to be TRUE by the end of this sprint for you to
increase investment in this project? What would cause you to pause?"

---

## PHASE 2 — PRIORITY RECOMMENDATION LAYER

After all questions are answered, perform a priority check.

Read the following before making any recommendation:
1. docs/backlog/ in ALL currently active projects (scan for open items)
2. docs/sprints/ for any in-progress work in this project
3. docs/council/ for any pending decisions blocking other work
4. The pre-sprint answers just given

### For a NEW FEATURE (no --new-project flag):

Compare the proposed feature against the current project backlog.
Ask yourself:
- Is there a feature already in flight that this depends on?
- Is there a feature with higher user impact sitting unfinished?
- Does this feature require a technical foundation that doesn't exist yet?
- Would a simpler POC prove the core assumption before building the full thing?

If any answer is YES, output a PRIORITY RECOMMENDATION:
─── PRIORITY RECOMMENDATION ──────────────────────────────────

Before building [proposed feature], consider:

OPTION A (recommended): [What to do instead or first]

Reason: [Specific reason — reference the backlog item or dependency]

OPTION B (your original plan): Proceed with [proposed feature]

Trade-off: [What you're accepting by skipping the recommendation]

OPTION C (if applicable): [POC version of proposed feature]

What to validate first: [Core assumption + cheapest test]

Your call: reply OPTION A, B, or C to proceed.

──────────────────────────────────────────────────────────────

Wait for the user's choice before writing the pre-sprint summary.

### For a NEW PROJECT (--new-project flag):

Read ALL active project backlogs and sprint states across docs/.
Ask yourself:
- Are there open BLOCKED items in other projects needing human input?
- Are there in-flight features 80%+ done that would take less effort to ship?
- Does this new project share infrastructure with existing projects?
- Are there council decisions pending that affect multiple projects?

If any answer is YES, output a CROSS-PROJECT RECOMMENDATION:
─── CROSS-PROJECT RECOMMENDATION ─────────────────────────────

Before starting [new project], consider:

OPEN ITEMS NEEDING ATTENTION:

- [Project]: [Item] — Status: BLOCKED, needs: [what]
- [Project]: [Item] — 80% done, ~[X hours] to ship

RECOMMENDATION: [Finish X first / Unblock Y / Proceed if you accept Z]

Your call: reply PROCEED or I'LL HANDLE X FIRST.

──────────────────────────────────────────────────────────────

### If no priority conflict found:
Output: "✓ No competing priorities found. Proceeding."
Then immediately output the pre-sprint summary.

---

## PHASE 3 — PRE-SPRINT SUMMARY

After priority choice is confirmed by the user, write:
- "What we're really building": 2 sentences
- "The riskiest assumption": 1 sentence
- "What we are explicitly not doing": bulleted list
- "The success signal": 1 measurable statement
- Status: READY_TO_SPEC | NEEDS_MORE_CLARITY

Write to: docs/pre-sprint/YYYY-MM-DD-[feature-name]-pre-sprint.md
