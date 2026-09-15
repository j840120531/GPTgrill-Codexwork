import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { ensureDir, shortHash } from './util.js';

export const defaultStateDir = () => path.join(os.homedir(), '.goal-loop');
export const statePath = (stateDir, workspace, goalId) => path.join(stateDir, 'state', shortHash(path.resolve(workspace)), `${goalId}.json`);

export async function readState(stateDir, workspace, goalId) {
  try { return JSON.parse(await fs.readFile(statePath(stateDir, workspace, goalId), 'utf8')); }
  catch { return undefined; }
}

export async function writeState(stateDir, workspace, state) {
  const p = statePath(stateDir, workspace, state.goalId);
  await ensureDir(path.dirname(p));
  const tmp = `${p}.tmp-${process.pid}`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  await fs.rename(tmp, p);
}

function lockPath(stateDir, workspace) {
  return path.join(stateDir, 'locks', shortHash(path.resolve(workspace)));
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export async function acquireWorkspaceLock(stateDir, workspace) {
  const p = lockPath(stateDir, workspace);
  await ensureDir(path.dirname(p));
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await fs.mkdir(p);
      await fs.writeFile(path.join(p, 'owner.json'), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }) + '\n', { mode: 0o600 });
      return async () => { await fs.rm(p, { recursive: true, force: true }); };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      let owner;
      try { owner = JSON.parse(await fs.readFile(path.join(p, 'owner.json'), 'utf8')); } catch { owner = undefined; }
      if (owner && pidAlive(owner.pid)) throw new Error(`Goal Loop is already running for this workspace (pid ${owner.pid})`);
      await fs.rm(p, { recursive: true, force: true });
    }
  }
  throw new Error('Could not acquire Goal Loop workspace lock');
}
