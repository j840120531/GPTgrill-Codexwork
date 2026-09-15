# One-prompt install for Codex

After cloning or pulling this repository, paste the block below into Codex from the target project you want Goal Loop to manage.

```text
Install and configure Goal Loop for my current project.

1. Read Goal Loop README.md, docs/SECURITY.md, and examples/dispatch.example.json first.
2. Ensure Node.js >= 20, git, and Codex CLI are available.
3. In the Goal Loop repository run npm install, npm run build, and npm test. Do not continue if any check fails.
4. Run npm link so the `goal-loop` command is available.
5. Confirm the codex-with-chatgpt Skill is installed for this Codex environment. If it is missing or unhealthy, repair it using that project's own Skill/instructions.
6. In my current project repository, first check git status. Do not mix unrelated uncommitted work into setup.
7. Run `goal-loop bootstrap --workspace <current repo root>`.
8. If bootstrap created `.goal-loop/README.md` and the project was clean before setup, commit and push only that Goal Loop bootstrap file with a small setup commit. If the project was not clean, do not commit anything; tell me what remains to be committed.
9. Run `goal-loop doctor --workspace <current repo root>` and fix all failures.
10. Install the macOS launchd watcher with `goal-loop install-service --workspace <current repo root>`.
11. Run `goal-loop status --workspace <current repo root>` and verify the watcher is healthy.
12. Do not create or start a dispatch goal on my behalf yet. Stop after showing a concise checklist for Goal Loop, codex-with-chatgpt, git control branch, and watcher health.
```

For normal operation, ChatGPT Web writes approved specs/tasks plus `.goal-loop/dispatch/<goal-id>.json` to the repo's control branch. Goal Loop watches that branch and dispatches local Codex automatically.
