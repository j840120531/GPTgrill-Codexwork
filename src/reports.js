import path from 'node:path';
import { promises as fs } from 'node:fs';
import { ensureDir, nowIso } from './util.js';

const root = (w, g) => path.join(w, 'reports', g);

export async function writePhaseReport(w, m, p, s, opts = {}) {
  const d = root(w, m.goalId);
  await ensureDir(d);
  const runs = s.taskRuns.filter(r => r.phaseId === p.id);
  const verification = [
    '- Task-level Codex + ChatGPT review loops completed.',
    opts.phaseReview ? '- Phase integration review completed.' : '- Phase integration review disabled by manifest.'
  ].join('\n');
  const body = `# ${m.goalId} — ${p.id} Phase Report\n\nGenerated: ${nowIso()}\n\n## Status\n\nPASS\n\n## Tasks\n\n${runs.map(r => `- ${r.taskId}: ${r.status}${r.commit ? ` — ${r.commit.slice(0, 12)}` : ''}`).join('\n')}\n\n## Verification\n\n${verification}\n\n## Next\n\n${m.mode === 'goal' ? 'Continue automatically unless the goal is complete.' : 'Paused at the configured human boundary. Increment the dispatch manifest `revision` to resume.'}\n`;
  const f = path.join(d, `${p.id}.md`);
  await fs.writeFile(f, body);
  return f;
}

export async function writeFinalReport(w, m, s, opts = {}) {
  const d = root(w, m.goalId);
  await ensureDir(d);
  const finalVerification = opts.finalReview ? '- Final goal review completed.' : '- Final goal review disabled by manifest.';
  const body = `# ${m.goalId} — Final Report\n\nGenerated: ${nowIso()}\n\n## Status\n\nDONE\n\n## Completed phases\n\n${s.completedPhases.map(x => `- ${x}`).join('\n')}\n\n## Completed tasks\n\n${s.completedTasks.map(x => `- ${x}`).join('\n')}\n\n## Verification\n\n- Task-level review loops completed.\n- Configured phase reviews completed.\n${finalVerification}\n\n## Branch\n\n\`${s.workBranch}\`\n`;
  const f = path.join(d, 'FINAL.md');
  await fs.writeFile(f, body);
  return f;
}
