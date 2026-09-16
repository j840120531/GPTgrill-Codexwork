import path from 'node:path';
import { defaultStateDir } from './state.js';

export function makeConfig(workspace) {
  return {
    workspace: path.resolve(workspace),
    pollSeconds: Number(process.env.GPTGRILL_CODEXWORK_POLL_SECONDS || 30),
    codexCommand: process.env.GPTGRILL_CODEXWORK_CODEX_COMMAND || 'codex',
    defaultCodexArgs: ['exec', '--full-auto'],
    stateDir: process.env.GPTGRILL_CODEXWORK_STATE_DIR || defaultStateDir(),
    controlRemote: process.env.GPTGRILL_CODEXWORK_CONTROL_REMOTE || 'origin',
    controlBranch: process.env.GPTGRILL_CODEXWORK_CONTROL_BRANCH || 'main'
  };
}
