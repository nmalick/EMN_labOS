# PR convention (all repos, all automation)

1. **Identity first**: `gh api user --jq .login` must print the expected account and
   `git config user.email` the matching address. STOP on mismatch — never proceed, never
   switch implicitly.
2. **Branch from `origin/main`** (or the declared integration branch) — never from whatever
   happens to be checked out; unrelated in-flight commits must not ride along.
3. **Stage exact paths only.** `git add -A` / `git add .` are forbidden — multi-agent runs and
   recently-dirty trees make them leak vectors.
4. Conventional subject; body explains what/why + verification evidence; end with the
   Co-Authored-By trailer when authored by an agent.
5. PR body = run summary + every ⚠️ follow-up item; nothing merged by automation.
6. `gh` unavailable ⇒ commit locally anyway, surface branch + SHA in the run report.
