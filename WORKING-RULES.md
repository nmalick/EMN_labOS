# Working rules

Imported by the root `CLAUDE.md`, so these apply in the umbrella and in every project repo beside
it. Writing style: `VOICE.md`.

## 1. Check accounts before anything else
At the start of every session, before any work:
- `git config user.email` for this repo → `nmalicksn@gmail.com`.
- `gh api user --jq .login` → `nmalick`. Switch with `gh auth switch -u nmalick` if it isn't.
- Each connected MCP connector: one cheap identity read where it offers one. The account must be
  personal, never one matching the work identifiers in `hooks/identities.local`.

Report the result in one line. **Stop on any mismatch**, say what needs switching, and never
switch an account silently or work around it.

## 2. Ask before anything bigger than a simple edit
A simple edit is one small, unambiguous change to an existing file. Anything else — several files,
a new file, a rename or delete, a change to a schema, gate or config, or a request that could be
read two ways — starts with clarifying questions, before planning or building.

## 3. Confirm before git, new files, or publishing
Never do any of these without an explicit request or a clear yes:
- commit, branch, push, or open/close/merge a PR
- create a new file
- publish anything: an Artifact page, a deploy, an external post

Editing existing files inside an approved task is fine. Invoking a command whose job is to commit
(`/improve`, `/labos-maintenance`) is itself the request. Approval covers that one action and does
not carry to the next.
