import { promises as fs } from 'node:fs';
import path from 'node:path';
import { assertRepoRelative, sha256 } from './util.js';

function assertString(v, n) {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`${n} must be a non-empty string`);
}

export function validateManifest(input) {
  if (!input || typeof input !== 'object') throw new Error('manifest must be an object');
  if (input.schemaVersion !== 1) throw new Error('schemaVersion must be 1');
  if (!Number.isInteger(input.revision) || input.revision < 1) throw new Error('revision must be an integer >= 1');
  assertString(input.goalId, 'goalId');
  assertString(input.title, 'title');
  if (!['ready', 'paused', 'cancelled'].includes(input.status)) throw new Error('invalid status');
  if (!['task', 'phase', 'goal'].includes(input.mode)) throw new Error('invalid mode');
  assertString(input.spec, 'spec');
  assertRepoRelative(input.spec, 'spec');
  if (!Array.isArray(input.phases) || !input.phases.length) throw new Error('phases required');

  const phaseIds = new Set();
  const taskIds = new Set();
  for (const p of input.phases) {
    assertString(p.id, 'phase id');
    if (phaseIds.has(p.id)) throw new Error(`duplicate phase id: ${p.id}`);
    phaseIds.add(p.id);
    if (!Array.isArray(p.tasks) || !p.tasks.length) throw new Error(`phase ${p.id} needs tasks`);
    for (const t of p.tasks) {
      assertString(t.id, 'task id');
      assertString(t.file, 'task file');
      assertRepoRelative(t.file, `task ${t.id} file`);
      if (taskIds.has(t.id)) throw new Error(`duplicate task id: ${t.id}`);
      taskIds.add(t.id);
    }
  }
  return input;
}

export function parseManifest(raw, source = '<memory>') {
  try {
    return { path: source, raw, sha256: sha256(raw), manifest: validateManifest(JSON.parse(raw)) };
  } catch (error) {
    throw new Error(`Invalid GPTgrill-Codexwork manifest ${source}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function loadManifest(filePath) {
  return parseManifest(await fs.readFile(filePath, 'utf8'), filePath);
}

export async function discoverManifests(workspace) {
  const dir = path.join(workspace, '.gptgrill-codexwork', 'dispatch');
  let names;
  try { names = await fs.readdir(dir); } catch { return []; }
  const out = [];
  for (const n of names.filter(x => x.endsWith('.json')).sort()) out.push(await loadManifest(path.join(dir, n)));
  return out;
}

export async function discoverManifestsFromGit(git, ref) {
  const prefix = '.gptgrill-codexwork/dispatch';
  const files = (await git.listFiles(ref, prefix)).filter(x => x.endsWith('.json')).sort();
  const out = [];
  for (const file of files) out.push(parseManifest(await git.show(ref, file), `${ref}:${file}`));
  return out;
}
