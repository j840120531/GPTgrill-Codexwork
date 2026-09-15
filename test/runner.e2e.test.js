import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, chmod, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from '../src/process.js';
import { GoalRunner } from '../src/runner.js';
import { readState } from '../src/state.js';

async function sh(cmd, args, cwd) {
  const r = await execFile(cmd, args, { cwd });
  if (r.code !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
}

async function setupRepo(manifest) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'goal-loop-e2e-'));
  const origin = path.join(root, 'origin.git');
  const seed = path.join(root, 'seed');
  const work = path.join(root, 'work');
  await sh('git', ['init', '--bare', origin], root);
  await sh('git', ['init', '-b', 'main', seed], root);
  await sh('git', ['config', 'user.email', 'test@example.com'], seed);
  await sh('git', ['config', 'user.name', 'Test'], seed);
  await mkdir(path.join(seed, 'specs', 'G1', 'tasks'), { recursive: true });
  await mkdir(path.join(seed, '.goal-loop', 'dispatch'), { recursive: true });
  await writeFile(path.join(seed, 'AGENTS.md'), 'Test repo\n');
  await writeFile(path.join(seed, 'specs', 'G1', 'SPEC.md'), '# Spec\n');
  await writeFile(path.join(seed, 'specs', 'G1', 'tasks', 'T1.md'), '# Task 1\n- [ ] create result1.txt\n');
  await writeFile(path.join(seed, 'specs', 'G1', 'tasks', 'T2.md'), '# Task 2\n- [ ] create result2.txt\n');
  await writeFile(path.join(seed, '.goal-loop', 'dispatch', 'G1.json'), JSON.stringify(manifest, null, 2));
  await sh('git', ['add', '-A'], seed);
  await sh('git', ['commit', '-m', 'seed'], seed);
  await sh('git', ['remote', 'add', 'origin', origin], seed);
  await sh('git', ['push', '-u', 'origin', 'main'], seed);
  await sh('git', ['clone', '-b', 'main', origin, work], root);
  await sh('git', ['config', 'user.email', 'test@example.com'], work);
  await sh('git', ['config', 'user.name', 'Test'], work);
  return { root, origin, seed, work };
}

function config(root, work, fake) {
  return {
    workspace: work,
    pollSeconds: 30,
    codexCommand: fake,
    defaultCodexArgs: [],
    stateDir: path.join(root, 'state'),
    controlRemote: 'origin',
    controlBranch: 'main'
  };
}

test('task mode pauses until manifest revision increases', async () => {
  const manifest = {
    schemaVersion: 1,
    revision: 1,
    goalId: 'G1',
    title: 'E2E',
    status: 'ready',
    mode: 'task',
    spec: 'specs/G1/SPEC.md',
    phases: [{ id: 'P1', tasks: [{ id: 'T1', file: 'specs/G1/tasks/T1.md' }, { id: 'T2', file: 'specs/G1/tasks/T2.md' }] }],
    execution: { baseBranch: 'main', autoPush: false, phaseReview: false, finalReview: false }
  };
  const { root, seed, work } = await setupRepo(manifest);
  const fake = path.join(root, 'fake-codex.sh');
  await writeFile(fake, `#!/bin/sh
prompt=$(cat)
if printf '%s' "$prompt" | grep -q 'TASK: T1'; then printf 'one\n' > result1.txt; fi
if printf '%s' "$prompt" | grep -q 'TASK: T2'; then printf 'two\n' > result2.txt; fi
echo 'GOAL_LOOP_RESULT: DONE'
`);
  await chmod(fake, 0o755);
  const runner = new GoalRunner(config(root, work, fake));

  assert.equal(await runner.runOnce(), true);
  assert.equal((await readFile(path.join(work, 'result1.txt'), 'utf8')).trim(), 'one');
  assert.equal(await runner.runOnce(), false, 'same revision must not cross the human boundary');

  manifest.revision = 2;
  await writeFile(path.join(seed, '.goal-loop', 'dispatch', 'G1.json'), JSON.stringify(manifest, null, 2));
  await sh('git', ['add', '.goal-loop/dispatch/G1.json'], seed);
  await sh('git', ['commit', '-m', 'approve next task'], seed);
  await sh('git', ['push'], seed);

  assert.equal(await runner.runOnce(), true);
  assert.equal((await readFile(path.join(work, 'result2.txt'), 'utf8')).trim(), 'two');
  const state = await readState(path.join(root, 'state'), work, 'G1');
  assert.equal(state.status, 'done');
  assert.deepEqual(state.completedTasks, ['T1', 'T2']);
});

test('phase mode does not auto-start the next phase on the same revision', async () => {
  const manifest = {
    schemaVersion: 1,
    revision: 1,
    goalId: 'G1',
    title: 'Phase gate',
    status: 'ready',
    mode: 'phase',
    spec: 'specs/G1/SPEC.md',
    phases: [
      { id: 'P1', tasks: [{ id: 'T1', file: 'specs/G1/tasks/T1.md' }] },
      { id: 'P2', tasks: [{ id: 'T2', file: 'specs/G1/tasks/T2.md' }] }
    ],
    execution: { baseBranch: 'main', autoPush: false, phaseReview: false, finalReview: false }
  };
  const { root, seed, work } = await setupRepo(manifest);
  const fake = path.join(root, 'fake-codex.sh');
  await writeFile(fake, `#!/bin/sh
prompt=$(cat)
if printf '%s' "$prompt" | grep -q 'TASK: T1'; then printf 'one\n' > result1.txt; fi
if printf '%s' "$prompt" | grep -q 'TASK: T2'; then printf 'two\n' > result2.txt; fi
echo 'GOAL_LOOP_RESULT: DONE'
`);
  await chmod(fake, 0o755);
  const runner = new GoalRunner(config(root, work, fake));

  assert.equal(await runner.runOnce(), true);
  const s1 = await readState(path.join(root, 'state'), work, 'G1');
  assert.equal(s1.status, 'paused');
  assert.deepEqual(s1.completedPhases, ['P1']);
  assert.equal(await runner.runOnce(), false);

  manifest.revision = 2;
  await writeFile(path.join(seed, '.goal-loop', 'dispatch', 'G1.json'), JSON.stringify(manifest, null, 2));
  await sh('git', ['add', '.goal-loop/dispatch/G1.json'], seed);
  await sh('git', ['commit', '-m', 'approve phase 2'], seed);
  await sh('git', ['push'], seed);

  assert.equal(await runner.runOnce(), true);
  const s2 = await readState(path.join(root, 'state'), work, 'G1');
  assert.equal(s2.status, 'done');
  assert.deepEqual(s2.completedPhases, ['P1', 'P2']);
});
