import test from 'node:test';
import assert from 'node:assert/strict';
import { taskPrompt } from '../src/prompts.js';

const m = { schemaVersion: 1, revision: 1, goalId: 'G1', title: 'Test', status: 'ready', mode: 'task', spec: 'specs/G1/SPEC.md', phases: [{ id: 'P1', tasks: [{ id: 'T1', file: 'specs/G1/tasks/T1.md' }] }] };

test('prompt contract', () => {
  const p = taskPrompt(m, m.phases[0], m.phases[0].tasks[0], 4);
  assert.match(p, /Use Codex with ChatGPT/);
  assert.match(p, /GOAL_LOOP_RESULT: DONE/);
  assert.match(p, /Do NOT commit or push/);
});
