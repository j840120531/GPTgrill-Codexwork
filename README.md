# Goal Loop

[中文说明](README.zh-CN.md)

**ChatGPT decides what to build. Codex builds it. ChatGPT reviews it. Goal Loop keeps the loop moving.**

Goal Loop is a repo-driven orchestration layer for a workflow where:

- **ChatGPT Web** handles requirements, planning, specs, task decomposition, and review.
- **Goal Loop** turns approved repo artifacts into an executable local workflow.
- **Codex** owns implementation, shell commands, tests, and code changes.
- **codex-with-chatgpt** connects Codex back to ChatGPT for planning/review/fix loops.
- **Git** is the durable source of truth between the web planning side and the local execution side.

Goal Loop is intentionally **not** a replacement for `codex-with-chatgpt`. It sits one layer above it.

---

## Why Goal Loop exists

Without an orchestrator, a typical workflow looks like this:

1. Discuss an idea in ChatGPT Web.
2. Clarify requirements.
3. Write a spec.
4. Manually switch to Codex.
5. Tell Codex which file to read.
6. Wait for implementation.
7. Manually return to ChatGPT for review.
8. Copy review feedback back to Codex.
9. Repeat for every task and every phase.

Goal Loop automates the handoff and state management around steps 4-9.

The intended experience is closer to:

```text
/grill
  -> clarify the idea
spec it
  -> produce a spec-ready synthesis
/goal phase
  -> write SPEC / PHASES / TASKS / dispatch
  -> local Goal Loop notices the dispatch
  -> Codex executes
  -> ChatGPT reviews through codex-with-chatgpt
  -> Codex fixes issues
  -> phase report is written
  -> pause for the next human decision
```

Or, when full autonomy is explicitly requested:

```text
/loop
  -> continue phase by phase
  -> stop only when the goal is complete or blocked
```

---

# Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ChatGPT Web Project                                                 │
│                                                                     │
│  Grill Me Skill                                                     │
│      │                                                              │
│      ├─ clarify problem / constraints / non-goals / acceptance      │
│      ▼                                                              │
│  Goal Loop Web Skill                                                │
│      │                                                              │
│      ├─ SPEC.md                                                     │
│      ├─ PHASES.md                                                   │
│      ├─ tasks/*.md                                                  │
│      └─ .goal-loop/dispatch/<goal-id>.json                          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ GitHub / control branch
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Target project repository                                           │
│                                                                     │
│  specs/...                 .goal-loop/dispatch/...                  │
│       │                            │                                │
└───────┼────────────────────────────┼────────────────────────────────┘
        │                            │ git fetch
        │                            ▼
        │                   ┌────────────────────┐
        │                   │ Goal Loop Runner   │
        │                   │ local state machine│
        │                   └─────────┬──────────┘
        │                             │ codex exec --full-auto
        │                             ▼
        │                        ┌──────────┐
        │                        │  Codex   │
        │                        └────┬─────┘
        │                             │ uses installed skill
        │                             ▼
        │                  ┌──────────────────────┐
        └─────────────────►│ codex-with-chatgpt   │
                           │ PLAN / REVIEW / FIX  │
                           └──────────┬───────────┘
                                      │
                                      ▼
                              ChatGPT review
```

## Responsibilities

| Component | Responsibility | Should not own |
|---|---|---|
| ChatGPT Web | requirements, planning, specs, review, human-facing decisions | local shell execution |
| Grill Me Skill | clarify what should be built | implementation |
| Goal Loop Web Skill | convert approved planning into durable repo artifacts and dispatch | local process execution |
| Goal Loop Runner | watch dispatches, choose the next unit of work, manage execution state, commit/push, reports | product decisions |
| Codex | edit files, run commands/tests, implement tasks | deciding long-term project scope |
| codex-with-chatgpt | Codex ↔ ChatGPT planning/review loop | task scheduling across phases |
| Git | durable project truth and handoff layer | transient runtime state |

---

# Important: Goal Loop has two parts

A common source of confusion is the name “Goal Loop” being used for both the web workflow and the local runner.

## 1. ChatGPT Web Skill

File:

```text
skills/goal-loop/SKILL.md
```

This is installed in ChatGPT Web.

It does **not** run Codex directly. It writes the planning and dispatch artifacts into the target repository.

## 2. Local Goal Loop Runner

This repository itself is installed on the Mac/local machine.

The runner watches the target repository, detects approved dispatch manifests, and invokes Codex automatically.

Therefore a complete setup looks like:

```text
ChatGPT Web
  ├─ Grill Me Skill
  └─ Goal Loop Skill

Local machine
  ├─ Goal Loop Runner
  ├─ Codex CLI
  └─ codex-with-chatgpt Skill
```

---

# Relationship with codex-with-chatgpt

Goal Loop is designed to **use an existing codex-with-chatgpt installation**.

There is no intended conflict.

The separation is:

```text
Goal Loop
  decides: What task should run next?
  decides: Should execution stop at this task/phase boundary?
  manages: branch, runtime state, commit/push, reports

codex-with-chatgpt
  decides with ChatGPT: How should this task be implemented?
  lets ChatGPT independently inspect/review the workspace
  loops: PLAN -> EXECUTION -> EXECUTED -> REVIEW -> PLAN/DONE
```

`goal-loop doctor` checks that the `codex-with-chatgpt` Skill exists in the Codex environment.

---

# ChatGPT Project and workspace binding

Goal Loop itself does not bind arbitrary ChatGPT conversations to arbitrary local folders.

Workspace identity is primarily handled by **codex-with-chatgpt**.

The intended model is:

```text
one local workspace
    ↕
one codex-with-chatgpt connector
    ↕
one ChatGPT Project
```

This prevents a random unrelated chat from silently controlling the wrong local repository.

Goal Loop then operates on the **repository configured on the local machine** and on the dispatch manifests that appear in that repository's control branch.

## Project mode vs long-chat controller

`codex-with-chatgpt` supports different conversation strategies.

For Goal Loop, a useful pattern is to keep one long-lived **Controller Chat** for a workspace when you want the same web conversation to contain:

- requirement discussion,
- goal dispatch,
- C2C planning/review,
- milestone follow-up.

Example:

```bash
c2c session -w /path/to/project --json

c2c session set \
  -w /path/to/project \
  --mode long-chat \
  --url "https://chatgpt.com/c/<controller-chat-id>"
```

This is optional. Goal Loop itself does not require one specific ChatGPT chat URL; that conversation routing belongs to `codex-with-chatgpt`.

---

# Web Skills

Goal Loop currently ships two web-facing Skills.

## Grill Me

File:

```text
skills/grill-me/SKILL.md
```

Purpose:

- clarify the observed problem,
- separate goals from proposed solutions,
- challenge assumptions,
- identify constraints,
- define scope and non-goals,
- surface edge cases and failure modes,
- create verifiable acceptance criteria.

Typical controls:

```text
/grill
harder
skip
summary
spec it
```

`spec it` produces a spec-ready synthesis; it does not automatically start implementation.

## Goal Loop Web Skill

File:

```text
skills/goal-loop/SKILL.md
```

Purpose:

- turn approved planning into repo artifacts,
- create phases/tasks,
- create a dispatch manifest,
- choose autonomy mode.

Typical controls:

```text
/goal task
/goal phase
/goal full
/loop
```

## Installing the web Skills manually

If ChatGPT allows direct Skill upload, upload these two files separately:

```text
skills/grill-me/SKILL.md
skills/goal-loop/SKILL.md
```

Do **not** upload the entire repository ZIP as one Skill.

If you downloaded this repository as a ZIP from GitHub, unzip it first and upload the two `SKILL.md` files above individually.

---

# Autonomy modes

Goal Loop intentionally separates three levels of autonomy.

## `task`

Execute one incomplete task, review it, push it, then pause.

Use when:

- the feature is high-risk,
- requirements are still evolving,
- you want tight human control.

```text
Task 1
  -> Codex
  -> ChatGPT review
  -> fix loop
  -> PASS
  -> pause
```

## `phase`

Execute all remaining tasks in one phase, perform a phase-level integration review, write a report, push, then pause.

This is the **recommended default**.

```text
P1-T01 -> review/fix
P1-T02 -> review/fix
P1-T03 -> review/fix
       -> phase integration review
       -> phase report
       -> pause
```

## `goal`

Continue through every remaining phase and the final review.

This is what `/goal full` and `/loop` map to.

```text
Phase 1
  -> review
Phase 2
  -> review
Phase 3
  -> review
Final review
  -> DONE
```

The run stops if it becomes blocked.

---

# Repository artifacts

A typical target project will contain:

```text
AGENTS.md

specs/
  HZ-004/
    SPEC.md
    PHASES.md
    tasks/
      P1-T01.md
      P1-T02.md
      P2-T01.md

.goal-loop/
  README.md
  dispatch/
    HZ-004.json

reports/
  HZ-004/
    P1.md
    P2.md
    FINAL.md
```

## Durable vs transient state

Durable engineering truth belongs in Git:

- specs,
- task definitions,
- acceptance criteria,
- reports,
- dispatch policy.

Transient execution state does **not** belong in Git.

Goal Loop stores runtime state under:

```text
~/.goal-loop/state/<workspace-hash>/<goal-id>.json
```

Examples of transient state:

- current task,
- current phase,
- completed tasks,
- last consumed revision,
- blocked reason,
- runtime lock information.

---

# Dispatch manifest

ChatGPT writes:

```text
.goal-loop/dispatch/<goal-id>.json
```

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
      "title": "Core validation",
      "tasks": [
        {
          "id": "P1-T01",
          "file": "specs/HZ-004/tasks/P1-T01.md"
        }
      ]
    }
  ],
  "execution": {
    "maxReviewIterations": 5,
    "phaseReview": true,
    "finalReview": true,
    "autoPush": true
  }
}
```

See [`examples/dispatch.example.json`](examples/dispatch.example.json) for the canonical example.

## `revision` is an approval token

`revision` starts at `1`.

For `task` and `phase` modes, Goal Loop deliberately pauses at the configured human boundary.

To authorize another execution step, update the manifest and increment:

```text
revision: 1 -> 2
```

This prevents an always-on watcher from silently continuing just because it is still running.

If a run is blocked, fixing the spec/task alone is not enough; increase `revision` when you explicitly want execution to resume.

---

# Task contract

A task should not be a vague instruction such as:

```text
Improve the evaluator.
```

Prefer an executable contract:

```markdown
# P1-T01 — Evaluator output validation

## Objective
Make invalid evaluator output fail deterministically.

## Acceptance Criteria
- [ ] Valid output passes schema validation.
- [ ] Invalid output returns deterministic validation errors.
- [ ] Existing smoke cases remain green.
- [ ] Scoring semantics do not change.

## Constraints
- Preserve the current public response schema.
- Do not change unrelated scoring logic.

## Out of Scope
- New evaluator dimensions.
- UI changes.
```

Acceptance criteria are what make autonomous review meaningful.

---

# What happens during execution

For each task, Goal Loop roughly does the following:

```text
1. fetch the control branch
2. find a runnable dispatch manifest
3. acquire a workspace lock
4. ensure the workspace is clean
5. checkout/create goal-loop/<goal-id>
6. merge the latest control/base branch
7. read SPEC + current task
8. call Codex
9. Codex invokes codex-with-chatgpt
10. ChatGPT plans/reviews
11. Codex fixes until DONE or BLOCKED
12. Goal Loop commits the result
13. Goal Loop pushes the goal branch
14. update local runtime state
15. continue or pause based on autonomy mode
```

Goal Loop invokes Codex using the equivalent of:

```text
codex exec --full-auto -C <workspace> -
```

The generated prompt tells Codex to:

- read repository instructions,
- read the spec,
- read only the current task,
- use `codex-with-chatgpt`,
- implement only in-scope work,
- run required validation,
- iterate until ChatGPT returns DONE or the review limit is exhausted,
- not commit or push itself.

Git ownership stays with Goal Loop for deterministic orchestration.

---

# Branching model

Default work branch:

```text
goal-loop/<goal-id>
```

Example:

```text
goal-loop/HZ-004
```

The control branch defaults to:

```text
origin/main
```

Override with:

```bash
export GOAL_LOOP_CONTROL_REMOTE=origin
export GOAL_LOOP_CONTROL_BRANCH=main
```

A manifest may also override the work branch through its `execution` section.

Goal Loop refuses to start autonomous execution when the local workspace has unrelated uncommitted changes.

---

# Phase review and final review

Task-level review is not the only review layer.

After all tasks in a phase are complete, Goal Loop can trigger a separate **phase integration review**.

This checks whether individually correct tasks work together correctly.

After the final phase, Goal Loop can trigger a **goal-level final review** against the complete spec.

Reports are written to:

```text
reports/<goal-id>/<phase-id>.md
reports/<goal-id>/FINAL.md
```

---

# Installation

## Requirements

- macOS for the included `launchd` service helper
- Node.js >= 20
- Git
- Codex CLI installed and authenticated
- `codex-with-chatgpt` already installed and connected for the target workspace

Foreground execution is not inherently macOS-specific, but the included background service helper currently uses `launchd`.

## Install Goal Loop Runner

```bash
git clone https://github.com/j840120531/goal-loop.git
cd goal-loop
npm install
npm run build
npm test
npm link
```

Verify:

```bash
goal-loop --help
```

## Bootstrap one target project

```bash
goal-loop bootstrap --workspace /path/to/project
goal-loop doctor --workspace /path/to/project
```

`doctor` checks key prerequisites including:

- valid Git repository,
- Codex command availability,
- `codex-with-chatgpt` Skill presence,
- configured control remote,
- fetchable control branch,
- Goal Loop dispatch directory.

## Run once manually

```bash
goal-loop run --workspace /path/to/project
```

## Install the macOS watcher

```bash
goal-loop install-service --workspace /path/to/project
```

The service polls every 30 seconds by default.

Logs are written under:

```text
~/Library/Logs/goal-loop/
```

Remove the watcher with:

```bash
goal-loop uninstall-service --workspace /path/to/project
```

---

# One-prompt installation with Codex

See [`INSTALL_FOR_CODEX.md`](INSTALL_FOR_CODEX.md).

The intended usage is to open Codex in the target project and ask it to clone/pull this repository, run the checks, link the CLI, bootstrap the project, verify `codex-with-chatgpt`, and install the watcher.

---

# Recommended daily workflow

## 1. Clarify requirements

In the ChatGPT Project bound to the target workspace:

```text
/grill
I want to change the simulated doctor's refusal behavior...
```

Continue until the requirements are `SPEC-READY`.

Then:

```text
spec it
```

## 2. Approve the spec direction

Review the synthesis before dispatching implementation.

## 3. Dispatch one phase

```text
/goal phase
```

The Goal Loop Web Skill writes the durable repo artifacts and a `ready` manifest.

## 4. Local execution starts automatically

The watcher fetches the control branch, sees the new manifest revision, and launches Codex.

## 5. Review happens through codex-with-chatgpt

Codex and ChatGPT iterate until the task/phase passes review or becomes blocked.

## 6. Read the phase report

At the phase boundary, inspect:

```text
reports/<goal-id>/<phase-id>.md
```

## 7. Continue deliberately

For `phase` mode, approve the next phase by incrementing the dispatch `revision`.

For full autonomy, use:

```text
/goal full
```

or:

```text
/loop
```

---

# Status and troubleshooting

## Check Goal Loop state

```bash
goal-loop status --workspace /path/to/project
```

## Run health checks

```bash
goal-loop doctor --workspace /path/to/project
```

## Common reasons a run does not start

- manifest `status` is not `ready`;
- `revision` was not incremented after a task/phase boundary;
- workspace has uncommitted changes;
- control branch cannot be fetched;
- `codex-with-chatgpt` Skill is missing;
- required spec/task file is missing;
- another Goal Loop process holds the workspace lock.

## Common reasons a run becomes blocked

- Codex exits unsuccessfully;
- C2C review returns BLOCKED;
- acceptance criteria cannot be satisfied;
- phase/final review fails;
- Git merge/push fails;
- the approved spec conflicts with the current repository state.

Goal Loop should stop rather than silently skip failed acceptance criteria.

---

# Safety model

Goal Loop provides orchestration boundaries, not a complete security sandbox.

`codex exec --full-auto` is powerful.

Recommended safeguards:

- use dedicated work branches;
- keep specs explicit;
- use verifiable acceptance criteria;
- prefer `phase` mode as the default;
- use `task` mode for high-risk changes;
- reserve `/loop` / `goal` mode for work whose scope is already stable;
- do not use unattended full-goal mode for destructive migrations, credential rotation, production infrastructure changes, or other operations that require explicit human approval.

See [`docs/SECURITY.md`](docs/SECURITY.md).

---

# Repository layout

```text
.
├── README.md
├── README.zh-CN.md
├── INSTALL_FOR_CODEX.md
├── package.json
├── examples/
│   └── dispatch.example.json
├── docs/
│   ├── CHATGPT_SKILL.md
│   └── SECURITY.md
├── skills/
│   ├── grill-me/
│   │   └── SKILL.md
│   └── goal-loop/
│       └── SKILL.md
├── src/
│   ├── cli.js
│   ├── codex.js
│   ├── config.js
│   ├── git.js
│   ├── manifest.js
│   ├── process.js
│   ├── prompts.js
│   ├── reports.js
│   ├── runner.js
│   ├── service.js
│   ├── state.js
│   └── util.js
└── test/
```

---

# Development

```bash
npm install
npm run build
npm test
```

Before changing orchestration behavior, verify at minimum:

- manifest validation,
- task/phase revision gates,
- branch behavior,
- fake-Codex end-to-end tests,
- blocked-state behavior.

---

# Design principles

1. **The repo is the durable contract.** Chat history is useful context, but specs/tasks in Git are the execution authority.
2. **Human intent must be explicit before autonomy.** Grill first; dispatch later.
3. **Autonomy is graduated.** Task, phase, and goal are deliberately different modes.
4. **Codex executes; ChatGPT reviews.** Do not collapse those roles into one self-approving agent.
5. **Runtime state stays local.** Avoid noisy state commits.
6. **Acceptance criteria matter more than confident prose.** A task is not done because an agent says it looks done.
7. **Stop on ambiguity or failure.** Do not silently widen scope to make a task pass.

---

# Current scope

Goal Loop currently focuses on a single-machine, Git-backed, Codex-based development workflow.

It is not yet intended to be:

- a hosted multi-user CI platform,
- a general remote execution service,
- a replacement for GitHub Actions,
- a replacement for `codex-with-chatgpt`,
- a full multi-agent swarm runtime.

The current goal is narrower: make the **ChatGPT Web -> repo -> local Codex -> ChatGPT review -> report** loop predictable, inspectable, and easy to control.
