# One-prompt install for Codex

After cloning/pulling this repository, or after installing the local Runner from a release package, paste the block below into Codex from the target project you want GPTgrill-Codexwork to manage.

> **Codex App users:** GPTgrill-Codexwork is compatible with Codex App, but autonomous execution currently uses the local `codex` CLI command rather than driving the App UI. Before setup, verify `which codex` and `codex --version`. If the command is unavailable, install the official Codex CLI as well. Keeping Codex App installed is fine.

```text
Install and configure GPTgrill-Codexwork for my current project.

1. Read GPTgrill-Codexwork README.md, docs/SECURITY.md, docs/RELEASE.md, and examples/dispatch.example.json first.
2. Confirm whether I am using Codex App. Codex App is allowed, but GPTgrill-Codexwork still requires the `codex` CLI executable. Verify both `which codex` and `codex --version`; do not assume the GUI app alone provides a terminal command.
3. Ensure Node.js >= 20 and git are available.
4. If this is a source checkout of GPTgrill-Codexwork, run npm install, npm run build, and npm test. Do not continue if any check fails. Then run npm link so the `gptgrill-codexwork` command is available. If GPTgrill-Codexwork was installed globally from the release `.tgz`, verify `gptgrill-codexwork --help` instead.
5. Confirm the codex-with-chatgpt Skill is already installed for this Codex environment. Do not install a second copy unless it is missing. If it is unhealthy, repair it using that project's own Skill/instructions.
6. In my current project repository, first check git status. Do not mix unrelated uncommitted work into setup.
7. Run `gptgrill-codexwork bootstrap --workspace <current repo root>`.
8. If bootstrap created `.gptgrill-codexwork/README.md` and the project was clean before setup, commit and push only that GPTgrill-Codexwork bootstrap file with a small setup commit. If the project was not clean, do not commit anything; tell me what remains to be committed.
9. Run `gptgrill-codexwork doctor --workspace <current repo root>` and fix all failures.
10. Install the macOS launchd watcher with `gptgrill-codexwork install-service --workspace <current repo root>`.
11. Run `gptgrill-codexwork status --workspace <current repo root>` and verify the watcher is healthy.
12. Do not create or start a dispatch goal on my behalf yet. Stop after showing a concise checklist for GPTgrill-Codexwork, Codex CLI, Codex App (if installed), codex-with-chatgpt, git control branch, and watcher health.
```

For normal operation, ChatGPT Web writes approved specs/tasks plus `.gptgrill-codexwork/dispatch/<goal-id>.json` to the repo's control branch. GPTgrill-Codexwork watches that branch and dispatches local Codex automatically.

## Release install option

A tagged release should contain:

```text
grill-me-web-skill-vX.Y.Z.zip
gptgrill-codexwork-web-skill-vX.Y.Z.zip
gptgrill-codexwork-local-vX.Y.Z.tgz
gptgrill-codexwork-local-vX.Y.Z.zip
SHA256SUMS.txt
```

For the packaged local Runner:

```bash
npm install -g ./gptgrill-codexwork-local-vX.Y.Z.tgz
gptgrill-codexwork --help
```

See `docs/RELEASE.md` / `docs/RELEASE.zh-CN.md` for the full release and installation contract.
