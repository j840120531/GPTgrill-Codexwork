import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from '../src/manifest.js';

const valid = {
  schemaVersion: 1,
  revision: 1,
  goalId: 'HZ-004',
  title: 'Evaluator',
  status: 'ready',
  mode: 'phase',
  spec: 'specs/HZ-004/SPEC.md',
  phases: [{ id: 'P1', tasks: [{ id: 'P1-T01', file: 'specs/HZ-004/tasks/P1-T01.md' }] }]
};

test('valid manifest', () => assert.equal(validateManifest(valid).goalId, 'HZ-004'));
test('reject missing revision', () => assert.throws(() => validateManifest({ ...valid, revision: undefined })));
test('reject traversal', () => assert.throws(() => validateManifest({ ...valid, spec: '../SECRET' })));
test('reject duplicate tasks', () => assert.throws(() => validateManifest({ ...valid, phases: [{ id: 'P1', tasks: [{ id: 'T1', file: 'a.md' }, { id: 'T1', file: 'b.md' }] }] })));
test('reject duplicate phases', () => assert.throws(() => validateManifest({ ...valid, phases: [{ id: 'P1', tasks: [{ id: 'T1', file: 'a.md' }] }, { id: 'P1', tasks: [{ id: 'T2', file: 'b.md' }] }] })));
