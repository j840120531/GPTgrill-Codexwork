import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cli=path.join(repoRoot,'src','cli.js');

function run(args){return spawnSync(process.execPath,[cli,...args],{cwd:repoRoot,encoding:'utf8'});}

test('goal-loop --help exits successfully without a workspace',()=>{
  const result=run(['--help']);
  assert.equal(result.status,0);
  assert.match(result.stdout,/Goal Loop/);
  assert.equal(result.stderr,'');
});

test('goal-loop -h exits successfully without a workspace',()=>{
  const result=run(['-h']);
  assert.equal(result.status,0);
  assert.match(result.stdout,/Commands:/);
  assert.equal(result.stderr,'');
});

test('goal-loop with no command remains a usage error',()=>{
  const result=run([]);
  assert.equal(result.status,2);
  assert.match(result.stderr,/Goal Loop/);
});
