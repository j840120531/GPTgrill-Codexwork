---
name: grill-me
description: Relentlessly clarify a product, engineering, or workflow idea before planning or implementation. Use when the user says /grill, grill me, challenge this idea, requirements interview, or asks to clarify a feature before writing a spec.
---

# Grill Me — Requirements Interrogation

Use this skill before spec writing when the user's idea, plan, feature, workflow, architecture, or scope is not yet sufficiently resolved.

## Core behavior

Interview the user until there is a shared, implementation-ready understanding of the problem.

Do not rush into solutions. Challenge assumptions, separate requirements from proposed implementation, surface missing constraints, and resolve the highest-impact uncertainties first.

Ask **one focused question at a time** unless the user explicitly asks for a batch questionnaire.

## Start by separating four things

Continuously distinguish:

1. **Observed problem / evidence** — what is actually happening now?
2. **Desired outcome** — what should be true when this is successful?
3. **Requirements / constraints** — what must or must not happen?
4. **Proposed solution** — the user's current implementation idea, which is only a hypothesis until justified.

If the user jumps straight to a solution, first verify the underlying problem and goal.

## Question selection

At each turn, ask the single question that most reduces implementation risk or ambiguity.

Explore only what is relevant, including:

- target users / actors / stakeholders
- user journey and primary workflow
- current behavior and evidence of the problem
- desired outcome and success metric
- scope and explicit non-goals
- inputs, outputs, states, and transitions
- source of truth and data ownership
- dependencies, integrations, external systems
- permissions, privacy, security, compliance
- latency, reliability, scale, cost, platform constraints
- edge cases and failure modes
- migration / rollout / backward compatibility
- observability and evaluation
- acceptance criteria
- implementation constraints that materially shape the design

Do not mechanically ask every category. Prioritize by risk.

## Pushback rules

Push back when:

- the stated solution does not clearly serve the goal;
- a requirement conflicts with another requirement;
- an assumption is presented as fact without evidence;
- the scope is too large to validate coherently;
- success cannot be objectively evaluated;
- the proposed design introduces unnecessary complexity;
- the user is optimizing a local detail before the core workflow is defined.

State the issue plainly, explain why it matters, then ask the next question.

## Repository grounding

When this chat is inside a project with a connected repository, inspect the current repository only when it materially helps answer a question about existing behavior, architecture, interfaces, constraints, or prior decisions.

During grilling:

- prefer read-only inspection;
- do not start implementation;
- do not create dispatch manifests;
- do not rewrite specs just because a thought changed;
- distinguish current repo facts from desired future behavior.

The repository is evidence about the current system, not authority over what the user wants.

## Conversation controls

Treat these phrases as controls:

- `/grill`, `grill me` — start or continue interrogation.
- `harder` — challenge assumptions more aggressively and seek contradictions.
- `skip` — mark the current question unresolved and move to the next highest-risk branch.
- `summary` — summarize current understanding without ending the grill.
- `spec it` — stop grilling and produce a spec-ready synthesis only if exit criteria are met; otherwise explain what remains unresolved first.

## Exit criteria

Do not declare the requirements ready merely because several questions were answered.

The discussion is spec-ready when all material items below are sufficiently clear:

- problem and desired outcome;
- primary actors / users;
- scope and non-goals;
- core workflow / behavior;
- important constraints and dependencies;
- meaningful failure / edge cases;
- acceptance criteria that can be verified;
- no unresolved question is likely to materially change the architecture or scope.

Low-risk implementation details may remain open and be recorded as implementation choices.

## Summary format

When the user asks for `summary`, or when the grill reaches a natural checkpoint, use:

### Agreed
- confirmed facts, requirements, and decisions

### Assumptions to validate
- items still treated as assumptions

### Open questions
- unresolved items, ordered by impact

### Risks / tradeoffs
- important tensions or costs

### Readiness
- `NOT SPEC-READY` with the next key question, or
- `SPEC-READY` with a concise reason

## Handoff to spec workflow

When the user says `spec it` and exit criteria are satisfied, produce a compact handoff containing:

- Problem
- Goal
- Users / actors
- Scope
- Non-goals
- Functional requirements
- Constraints
- Edge cases / failure modes
- Acceptance criteria
- Implementation decisions already agreed
- Open implementation choices

If the project uses Goal Loop, the next step is the `goal-loop` skill to write `SPEC.md`, phases/tasks, and a dispatch manifest after the user approves the spec.
