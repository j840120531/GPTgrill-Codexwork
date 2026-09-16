# GPTgrill-Codexwork

[简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

**Think with a high-capability model. Execute with Codex and subagents. Keep Git as the source of truth.**

GPTgrill-Codexwork is an open-source orchestration layer that connects **ChatGPT Web planning** with **local Codex execution**.

Its core idea is model specialization:

- use a high-capability ChatGPT Web model, such as **GPT-5.6 Sol High**, for requirements, architecture, specs, critical decisions, and review;
- use **Codex** with an execution-oriented model setup, such as **Luna Max + subagents** where available, for code reading, implementation, testing, debugging, and parallel work;
- use **Git** to persist specs, tasks, dispatch state, and reports between the web and local execution layers.

This avoids spending the strongest model on every mechanical implementation step while preserving high-quality reasoning at the points where it matters most. Model names, limits, and availability may change; the architecture does not depend on any specific model being permanently free or unlimited.

---

## How it works

```text
ChatGPT Web
  /grill
  requirements / architecture / decisions
        │
        ▼
  spec it
        │
        ▼
  /goal task | /goal phase | /goal full
        │
        ▼
Git repository
  SPEC.md / PHASES.md / tasks/*.md
  .gptgrill-codexwork/dispatch/*.json
        │
        ▼
GPTgrill-Codexwork Runner
  watches the control branch
        │
        ▼
Codex CLI + subagents
  implement / test / fix
        │
        ▼
codex-with-chatgpt
  PLAN / REVIEW / FIX
        │
        ▼
Git branch + phase/final reports
```

GPTgrill-Codexwork does not replace `codex-with-chatgpt`. It adds the durable scheduling and state-management layer around it.

---

## Components

| Component | Role |
|---|---|
| **Grill Me Web Skill** | Clarifies the real problem, constraints, non-goals, edge cases, and acceptance criteria. |
| **GPTgrill-Codexwork Web Skill** | Converts approved planning into repo artifacts and dispatch manifests. |
| **GPTgrill-Codexwork Runner** | Watches dispatches, manages execution state, branches, commits, pushes, and reports. |
| **Codex CLI** | Performs implementation, shell work, tests, and fixes. |
| **codex-with-chatgpt** | Connects Codex back to ChatGPT for independent planning and review. |
| **Git** | Durable source of truth between planning and execution. |

---

## Quick start

### Requirements

- Node.js 20+
- Git
- Codex CLI available in the shell
- `codex-with-chatgpt` installed in the Codex environment
- macOS for the built-in `launchd` service installer
- a ChatGPT setup capable of using the included Web Skills and writing approved repo artifacts

### Install the local runner

From a tagged release:

```bash
npm install -g ./gptgrill-codexwork-local-vX.Y.Z.tgz
gptgrill-codexwork --help
```

From source:

```bash
git clone https://github.com/j840120531/GPTgrill-Codexwork.git
cd GPTgrill-Codexwork
npm install
npm run check
npm link
```

### Attach a project repository

```bash
gptgrill-codexwork bootstrap --workspace /path/to/project
gptgrill-codexwork doctor --workspace /path/to/project
gptgrill-codexwork install-service --workspace /path/to/project
gptgrill-codexwork status --workspace /path/to/project
```

`bootstrap` creates the control-plane directory:

```text
.gptgrill-codexwork/
  README.md
  dispatch/
```

Runtime state stays outside the project repository under `~/.gptgrill-codexwork/`.

For a guided Codex setup, see [`INSTALL_FOR_CODEX.md`](INSTALL_FOR_CODEX.md).

---

## Web Skills

Two Web Skills are included:

```text
skills/grill-me/SKILL.md
skills/gptgrill-codexwork/SKILL.md
```

Tagged releases also publish upload-ready ZIP packages for both Skills.

Typical planning flow:

```text
/grill
  -> challenge assumptions and clarify requirements

spec it
  -> produce a spec-ready synthesis

/goal phase
  -> write SPEC / PHASES / TASKS / dispatch
```

### Autonomy modes

| Mode | Behavior |
|---|---|
| `task` | Execute one task, review it, then stop at the human approval boundary. |
| `phase` | Execute the remaining tasks in the current phase, perform an integration review, write a phase report, then stop. |
| `goal` | Continue through all remaining phases and final review until complete or blocked. |

`phase` is a practical default for most development work.

---

## Repository contract

A managed project typically contains:

```text
AGENTS.md

specs/<goal>/
  SPEC.md
  PHASES.md
  tasks/
    P1-T01.md
    P1-T02.md

.gptgrill-codexwork/
  README.md
  dispatch/
    <goal-id>.json

reports/<goal>/
  P1.md
  P2.md
  FINAL.md
```

A dispatch manifest is the execution trigger:

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "goalId": "example-goal",
  "title": "Example goal",
  "status": "ready",
  "mode": "phase",
  "spec": "specs/example-goal/SPEC.md",
  "phases": [
    {
      "id": "P1",
      "title": "Core implementation",
      "tasks": [
        {
          "id": "P1-T01",
          "file": "specs/example-goal/tasks/P1-T01.md"
        }
      ]
    }
  ]
}
```

See [`examples/dispatch.example.json`](examples/dispatch.example.json) for the canonical example.

### Revision as an approval token

For `task` and `phase` modes, advancing past an approval boundary requires a higher manifest `revision`.

```text
revision: 1 -> 2
```

This prevents an always-on watcher from silently continuing after a configured stop point.

---

## Execution and safety model

Before autonomous execution, the runner requires a clean workspace, fetches the configured control branch, acquires a workspace lock, and validates the dispatch state.

During execution it:

```text
fetch control branch
→ select runnable dispatch
→ checkout/create gptgrill-codexwork/<goal-id>
→ invoke Codex
→ run C2C plan/review/fix loop
→ commit and push through the runner
→ update runtime state
→ continue or stop at the configured boundary
```

Key safeguards include:

- no autonomous run on unrelated uncommitted local changes;
- one execution lock per workspace;
- explicit revision gates for task/phase continuation;
- bounded review iterations;
- specs and reports stored in Git, transient runtime state stored outside Git;
- Codex is instructed not to commit or push directly during orchestrated runs.

See [`docs/SECURITY.md`](docs/SECURITY.md) for the trust model.

---

## Multi-project operation

Each repository can install its own watcher and runtime state. Multiple projects can therefore be monitored independently on the same machine.

```text
Project A -> watcher A -> Codex
Project B -> watcher B -> Codex
Project C -> watcher C -> Codex
```

Current releases isolate projects at the workspace level. A global cross-project concurrency scheduler is not yet included.

---

## Controller Chat integration

Conversation routing is handled by `codex-with-chatgpt`, not by the runner itself.

A workspace can optionally use a persistent Controller Chat:

```bash
c2c session set \
  -w /path/to/project \
  --mode long-chat \
  --url "https://chatgpt.com/c/<conversation-id>"
```

Git remains the durable project truth; the Controller Chat is a reasoning and review workspace and can be replaced when needed.

---

## Current limitations

- Autonomous execution currently invokes the local `codex` CLI rather than driving the Codex App UI.
- `install-service` currently targets macOS `launchd`; `run` and `watch` can still be invoked directly from the CLI.
- Cross-project global concurrency limits and priority queues are not yet implemented.
- Web-side repository writes depend on the ChatGPT environment and connected repository permissions.

---

## Documentation

- [`INSTALL_FOR_CODEX.md`](INSTALL_FOR_CODEX.md) — guided installation
- [`docs/CHATGPT_SKILL.md`](docs/CHATGPT_SKILL.md) — Web Skill notes
- [`docs/SECURITY.md`](docs/SECURITY.md) — security and trust model
- [`docs/RELEASE.md`](docs/RELEASE.md) — release process

---

## License

MIT. See [`LICENSE`](LICENSE).
