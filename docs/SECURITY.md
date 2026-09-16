# Security model

GPTgrill-Codexwork is intentionally a thin orchestrator, not a new coding sandbox.

- Codex execution uses the user's installed Codex CLI and its sandbox/approval configuration.
- The default runner invokes `codex exec --full-auto`, which is intended for workspace-scoped edits. Review the current Codex security semantics before using this on untrusted repositories.
- GPTgrill-Codexwork refuses to start a goal when the git workspace has pre-existing uncommitted changes.
- Spec/task paths in dispatch manifests must be repository-relative and cannot traverse outside the workspace.
- Runtime state is stored under `~/.gptgrill-codexwork` with file mode 0600 where supported; it is not committed.
- GPTgrill-Codexwork does not store ChatGPT OAuth tokens, Codex credentials, or C2C secrets.
- Automatic push is enabled by default in the manifest example. Use a dedicated goal branch and branch protection if the repository is high-risk.
- Do not use `mode=goal` for destructive migrations, secrets rotation, production infrastructure changes, or other work that requires explicit human approval at each boundary.
