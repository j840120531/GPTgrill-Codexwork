# Goal Loop

**ChatGPT decides what to build. Codex builds it. ChatGPT reviews it. Goal Loop keeps the loop moving.**

Goal Loop is a small repo-driven orchestrator for a workflow where ChatGPT Web is the requirements/spec/review layer and a local Codex installation is the implementation layer.

It is designed to sit on top of **Codex with ChatGPT** rather than replace it.

## What problem it solves

Without Goal Loop the handoff often looks like this:

1. Grill requirements in ChatGPT Web.
2. Write a spec into GitHub.
3. Manually switch to Codex and tell it to read the spec.
4. Wait for implementation.
5. Manually ask ChatGPT to review.
6. Repeat for every task/phase.

Goal Loop turns steps 3-6 into an explicit state machine.

```text
ChatGPT Web
  grill -> plan -> spec -> phases -> tasks
                     |
                     v
          .goal-loop/dispatch/*.json
                     |
                     v
              Goal Loop (local)
                     |
                     v
                 Codex CLI
                     |
          codex-with-chatgpt C2C
             plan <-> review/fix
                     |
                     v
              goal branch + reports
```

## Autonomy modes

- `task`: execute one task, review it, push it, then pause.
- `phase`: execute all remaining tasks in the current phase, run a phase integration review, write a phase report, push, then pause. **Recommended default.**
- `goal`: continue phase by phase through final review and stop only when done or blocked.

## Requirements

- macOS (service helper currently uses launchd; foreground mode is portable)
- Node.js >= 20
- git
- Codex CLI installed and logged in
- `codex-with-chatgpt` installed as a Codex Skill and connected for the target workspace

## Install

```bash
git clone <THIS_REPO_URL>
cd goal-loop
npm install
npm run build
npm link
```

Then in each project repo:

```bash
goal-loop bootstrap --workspace /path/to/project
goal-loop doctor --workspace /path/to/project
```

Commit the generated `.goal-loop/README.md` directory if desired.

### Run manually

```bash
goal-loop run --workspace /path/to/project
```

### Run continuously on macOS

```bash
goal-loop install-service --workspace /path/to/project
```

The launchd service polls every 30 seconds. Logs are written under `~/Library/Logs/goal-loop/`.

To remove it:

```bash
goal-loop uninstall-service --workspace /path/to/project
```

## Dispatch contract

ChatGPT writes `.goal-loop/dispatch/<goal-id>.json` to the repo control branch (default: `origin/main`). See [`examples/dispatch.example.json`](examples/dispatch.example.json). The local watcher reads control manifests from the fetched remote branch, so it can notice web-side updates without changing the currently checked-out goal branch.

The human-readable spec/task files remain the authority. The dispatch file only points at them and defines autonomy policy. `revision` is an explicit resume token: start at 1, then increment it only when the user approves another task/phase attempt or resolves a blocker.

Example:

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "goalId": "HZ-004",
  "title": "Evaluator hardening",
  "status": "ready",
  "mode": "phase",
  "spec": "specs/HZ-004/SPEC.md",
  "phases": [
    {
      "id": "P1",
      "tasks": [
        { "id": "P1-T01", "file": "specs/HZ-004/tasks/P1-T01.md" }
      ]
    }
  ]
}
```

## What happens for each task

Goal Loop asks Codex to:

1. read repository instructions, the goal spec, and the current task;
2. use the installed `codex-with-chatgpt` skill;
3. implement only that task;
4. run required tests;
5. send EXECUTED to ChatGPT and iterate on review findings;
6. return `GOAL_LOOP_RESULT: DONE` or `BLOCKED`.

Goal Loop then commits and (by default) pushes the resulting change to a dedicated goal branch. Before a resumed run, it merges the updated base/control branch into that goal branch so newly approved specs, tasks, and manifest revisions are present locally.

Codex is explicitly told **not to commit or push** so git ownership stays deterministic in the runner.

## Phase and final review

After all tasks in a phase, Goal Loop runs a separate phase-level C2C review. It can fix integration defects before the phase report is written.

At the end of a full goal, a final end-to-end C2C review runs against the complete spec before `reports/<goal-id>/FINAL.md` is generated.

## Runtime state

Execution state is intentionally **not** committed. It lives under:

```text
~/.goal-loop/state/<workspace-hash>/<goal-id>.json
```

This includes the current phase/task, completed tasks, task commits, and blocked reason.

Durable engineering artifacts belong in the repo; transient process state does not.

## Branching

Default work branch:

```text
goal-loop/<goal-id>
```

Override with `execution.workBranch` in the dispatch manifest.

Goal Loop refuses to start if the workspace already has uncommitted changes. This prevents it from accidentally mixing the user's work into an autonomous run.

## Recommended web workflow

```text
/grill
  -> clarify problem, constraints, non-goals, success criteria
/to-spec
  -> write SPEC.md
/to-tickets
  -> write vertical-slice task files
/goal phase
  -> write ready dispatch manifest
```

Then the local service takes over. In `task` and `phase` modes it stops at the configured boundary and leaves the run paused. The always-on watcher will not silently continue: after you explicitly approve the next step, ChatGPT increments the dispatch manifest `revision` and commits that update to the control branch. In `goal` mode it keeps going until final review passes or the run becomes blocked.

An installable ChatGPT Web Skill is included at [`skills/goal-loop/SKILL.md`](skills/goal-loop/SKILL.md), with integration notes in [`docs/CHATGPT_SKILL.md`](docs/CHATGPT_SKILL.md).

## Failure behavior

Goal Loop stops and records `blocked` when:

- a required spec/task file is missing;
- Codex exits unsuccessfully;
- Codex/C2C returns `GOAL_LOOP_RESULT: BLOCKED`;
- phase/final review does not reach DONE;
- git operations fail;
- the workspace was dirty before the run.

It does not silently skip failed acceptance criteria.

## Status

```bash
goal-loop status --workspace /path/to/project
```

## Development

```bash
npm install
npm run build
npm test
```

## Safety note

`codex exec --full-auto` is powerful. Goal Loop narrows orchestration and scope, but it is not a security sandbox. Use dedicated branches, explicit acceptance criteria, and human phase gates for high-impact work. See [`docs/SECURITY.md`](docs/SECURITY.md).

## Control branch configuration

By default Goal Loop watches `origin/main` for dispatch updates. Override these for repositories with a different control branch or remote:

```bash
export GOAL_LOOP_CONTROL_REMOTE=origin
export GOAL_LOOP_CONTROL_BRANCH=main
```

The goal work itself stays on `goal-loop/<goal-id>` unless the manifest overrides `execution.workBranch`.

## Boundary/resume semantics

- `task`: one incomplete task per approved manifest revision, then pause.
- `phase`: one incomplete phase per approved manifest revision, then pause.
- `goal`: continue through all remaining phases without revision gates.
- `blocked`: requires a higher manifest revision before retry.

Changing a paused manifest without incrementing `revision` does not authorize more execution. This is deliberate: the Git watcher can run continuously without accidentally blowing through human gates.
