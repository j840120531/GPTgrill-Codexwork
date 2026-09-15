# One-prompt install for Codex

After cloning/pulling this repository, or after installing the local Runner from a release package, paste the block below into Codex from the target project you want Goal Loop to manage.

> **Codex App users:** Goal Loop is compatible with Codex App, but autonomous execution currently uses the local `codex` CLI command rather than driving the App UI. Before setup, verify `which codex` and `codex --version`. If the command is unavailable, install the official Codex CLI as well. Keeping Codex App installed is fine.

```text
Install and configure Goal Loop for my current project.

1. Read Goal Loop README.md, docs/SECURITY.md, docs/RELEASE.md, and examples/dispatch.example.json first.
2. Confirm whether I am using Codex App. Codex App is allowed, but Goal Loop still requires the `codex` CLI executable. Verify both `which codex` and `codex --version`; do not assume the GUI app alone provides a terminal command.
3. Ensure Node.js >= 20 and git are available.
4. If this is a source checkout of Goal Loop, run npm install, npm run build, and npm test. Do not continue if any check fails. Then run npm link so the `goal-loop` command is available. If Goal Loop was installed globally from the release `.tgz`, verify `goal-loop --help` instead.
5. Confirm the codex-with-chatgpt Skill is already installed for this Codex environment. Do not install a second copy unless it is missing. If it is unhealthy, repair it using that project's own Skill/instructions.
6. In my current project repository, first check git status. Do not mix unrelated uncommitted work into setup.
7. Run `goal-loop bootstrap --workspace <current repo root>`.
8. If bootstrap created `.goal-loop/README.md` and the project was clean before setup, commit and push only that Goal Loop bootstrap file with a small setup commit. If the project was not clean, do not commit anything; tell me what remains to be committed.
9. Run `goal-loop doctor --workspace <current repo root>` and fix all failures.
10. Install the macOS launchd watcher with `goal-loop install-service --workspace <current repo root>`.
11. Run `goal-loop status --workspace <current repo root>` and verify the watcher is healthy.
12. Do not create or start a dispatch goal on my behalf yet. Stop after showing a concise checklist for Goal Loop, Codex CLI, Codex App (if installed), codex-with-chatgpt, git control branch, and watcher health.
```

For normal operation, ChatGPT Web writes approved specs/tasks plus `.goal-loop/dispatch/<goal-id>.json` to the repo's control branch. Goal Loop watches that branch and dispatches local Codex automatically.

## Release install option

A tagged release should contain:

```text
grill-me-web-skill-vX.Y.Z.zip
goal-loop-web-skill-vX.Y.Z.zip
goal-loop-local-vX.Y.Z.tgz
goal-loop-local-vX.Y.Z.zip
SHA256SUMS.txt
```

For the packaged local Runner:

```bash
npm install -g ./goal-loop-local-vX.Y.Z.tgz
goal-loop --help
```

See `docs/RELEASE.md` / `docs/RELEASE.zh-CN.md` for the full release and installation contract.
