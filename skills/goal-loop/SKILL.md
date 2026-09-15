---
name: goal-loop
description: Turn an approved ChatGPT planning discussion into repo-backed specs, phases, tasks, and a Goal Loop dispatch manifest for autonomous local Codex execution. Use when the user says /goal task, /goal phase, /goal full, /loop, dispatch this plan, or asks to hand an approved spec to local Codex.
---

# Goal Loop — ChatGPT Web Skill

Use this only after the requirements are sufficiently resolved. If the user is still exploring what they want, use their grilling/spec workflow first rather than dispatching prematurely.

## Purpose

ChatGPT is the requirements/spec/review layer. Local Codex is the implementation layer. Goal Loop bridges them through durable repo artifacts.

## Before dispatch

1. Inspect the connected repository and its current planning artifacts.
2. Confirm the problem, scope, non-goals, constraints, acceptance criteria, and important implementation decisions are explicit.
3. Prefer vertical-slice tasks that are independently verifiable. Do not split only by technical layer.
4. Do not mark a goal ready if unresolved questions could materially change implementation.

## Durable artifacts

Write or update:

- `specs/<goal-id>/SPEC.md`
- `specs/<goal-id>/PHASES.md` when multiple phases are useful
- `specs/<goal-id>/tasks/<task-id>.md` for each executable task
- `.goal-loop/dispatch/<goal-id>.json`

Each task must include Objective, Acceptance Criteria, Constraints, and Out of Scope.

## Modes

Map user intent exactly:

- `/goal task` -> `mode: "task"`: execute one task, review, push, then pause.
- `/goal phase` -> `mode: "phase"`: complete one phase including integration review, report, push, then pause. This is the recommended default.
- `/goal full` or `/loop` -> `mode: "goal"`: continue through all phases and final review unless blocked.

## Revision gate

Every manifest has an integer `revision` starting at 1.

For `task` and `phase` modes, Goal Loop will pause at the configured boundary and will NOT continue merely because the watcher is still running. When the user explicitly approves continuation, increment `revision` by 1 and commit that manifest update to the control branch. Do not reset or replace the goal id just to continue.

If a run is BLOCKED and the user resolves the blocker, update the relevant spec/task/manifest as needed and increment `revision` to authorize another attempt.

## Dispatch schema

Use the repository's `examples/dispatch.example.json` as the canonical example. Required top-level fields:

- `schemaVersion: 1`
- `revision: <integer >= 1>`
- `goalId`
- `title`
- `status: "ready" | "paused" | "cancelled"`
- `mode: "task" | "phase" | "goal"`
- `spec`
- non-empty `phases[]`, each with non-empty `tasks[]`

`spec` and task `file` paths must be repository-relative and may not traverse outside the repo.

## Safety / ownership

- Keep transient runtime state out of Git. Never write PID, locks, browser URLs, or iteration counters into the repo.
- Never put secrets in specs or dispatch files.
- Goal Loop owns commits/pushes made by autonomous runs; task prompts tell Codex not to commit or push itself.
- Do not use full-goal autonomy for destructive migrations, credential rotation, production infrastructure changes, or other work requiring explicit human approval at each step.

## Phase reporting

After a phase run, inspect the pushed `goal-loop/<goal-id>` branch and `reports/<goal-id>/<phase-id>.md` when the user asks for status. Summarize completed tasks, verification, decisions, blockers, and the next phase. For phase/task modes, wait for explicit user approval before incrementing `revision`.
