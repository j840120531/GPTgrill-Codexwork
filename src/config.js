import path from 'node:path';
import { defaultStateDir } from './state.js';

export function makeConfig(workspace) {
  return {
    workspace: path.resolve(workspace),
    pollSeconds: Number(process.env.GOAL_LOOP_POLL_SECONDS || 30),
    codexCommand: process.env.GOAL_LOOP_CODEX_COMMAND || 'codex',
    defaultCodexArgs: ['exec', '--full-auto'],
    stateDir: process.env.GOAL_LOOP_STATE_DIR || defaultStateDir(),
    controlRemote: process.env.GOAL_LOOP_CONTROL_REMOTE || 'origin',
    controlBranch: process.env.GOAL_LOOP_CONTROL_BRANCH || 'main'
  };
}
