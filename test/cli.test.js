import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cli=path.join(repoRoot,'src','cli.js');

function run(args){return spawnSync(process.execPath,[cli,...args],{cwd:repoRoot,encoding:'utf8'});}

test('gptgrill-codexwork --help exits successfully without a workspace',()=>{
  const result=run(['--help']);
  assert.equal(result.status,0);
  assert.match(result.stdout,/GPTgrill-Codexwork/);
  assert.equal(result.stderr,'');
});

test('gptgrill-codexwork -h exits successfully without a workspace',()=>{
  const result=run(['-h']);
  assert.equal(result.status,0);
  assert.match(result.stdout,/Commands:/);
  assert.equal(result.stderr,'');
});

test('gptgrill-codexwork with no command remains a usage error',()=>{
  const result=run([]);
  assert.equal(result.status,2);
  assert.match(result.stderr,/GPTgrill-Codexwork/);
});
