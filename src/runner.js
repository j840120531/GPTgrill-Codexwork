import path from 'node:path';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import { discoverManifests, discoverManifestsFromGit } from './manifest.js';
import { acquireWorkspaceLock, readState, writeState } from './state.js';
import { Git } from './git.js';
import { nowIso, pathExists, slug } from './util.js';
import { runCodex } from './codex.js';
import { finalReviewPrompt, phaseReviewPrompt, taskPrompt } from './prompts.js';
import { writeFinalReport, writePhaseReport } from './reports.js';
import { execFile } from './process.js';

export class GoalRunner {
  constructor(config) {
    this.config = config;
    this.git = new Git(config.workspace);
  }

  async doctor() {
    const issues = [];
    if (!(await this.git.isRepo())) return ['workspace is not a git repository'];

    const codex = await execFile(this.config.codexCommand, ['--version']);
    if (codex.code !== 0) issues.push(`Codex command not available: ${this.config.codexCommand}`);

    const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
    const c2cSkill = path.join(codexHome, 'skills', 'codex-with-chatgpt', 'SKILL.md');
    if (!(await pathExists(c2cSkill))) issues.push(`codex-with-chatgpt Skill not found at ${c2cSkill}`);

    const remote = await execFile('git', ['remote', 'get-url', this.config.controlRemote], { cwd: this.config.workspace });
    if (remote.code !== 0) issues.push(`git remote '${this.config.controlRemote}' is not configured`);
    else {
      const fetched = await execFile('git', ['fetch', '--prune', this.config.controlRemote], { cwd: this.config.workspace });
      if (fetched.code !== 0) issues.push(`cannot fetch ${this.config.controlRemote}: ${fetched.stderr.trim()}`);
      else {
        const ref = `${this.config.controlRemote}/${this.config.controlBranch}`;
        const check = await execFile('git', ['rev-parse', '--verify', ref], { cwd: this.config.workspace });
        if (check.code !== 0) issues.push(`control branch '${ref}' does not exist`);
      }
    }

    if (!(await pathExists(path.join(this.config.workspace, '.gptgrill-codexwork', 'dispatch')))) {
      issues.push('.gptgrill-codexwork/dispatch does not exist locally (run bootstrap)');
    }
    return issues;
  }

  async bootstrap() {
    const d = path.join(this.config.workspace, '.gptgrill-codexwork', 'dispatch');
    await fs.mkdir(d, { recursive: true });
    const r = path.join(this.config.workspace, '.gptgrill-codexwork', 'README.md');
    if (!(await pathExists(r))) {
      await fs.writeFile(r,
        '# GPTgrill-Codexwork control plane\n\n' +
        'ChatGPT writes `.gptgrill-codexwork/dispatch/*.json`; local GPTgrill-Codexwork consumes them. ' +
        'Runtime state lives outside the repo under `~/.gptgrill-codexwork`.\n\n' +
        'For `task` and `phase` modes, increment the manifest `revision` to explicitly resume after a boundary.\n');
    }
  }

  async loadControlManifests() {
    const ref = `${this.config.controlRemote}/${this.config.controlBranch}`;
    try {
      return await discoverManifestsFromGit(this.git, ref);
    } catch {
      return await discoverManifests(this.config.workspace);
    }
  }

  async isRunnable(loaded) {
    const m = loaded.manifest;
    if (m.status !== 'ready') return false;
    const s = await readState(this.config.stateDir, this.config.workspace, m.goalId);
    if (!s) return true;
    if (s.status === 'running') return true;
    return m.revision > (s.lastConsumedRevision ?? 0);
  }

  async runOnce() {
    const release = await acquireWorkspaceLock(this.config.stateDir, this.config.workspace);
    try {
      await this.git.assertClean();
      await this.git.fetch(this.config.controlRemote);
      const manifests = await this.loadControlManifests();
      let candidate;
      for (const loaded of manifests) {
        if (await this.isRunnable(loaded)) { candidate = loaded; break; }
      }
      if (!candidate) return false;
      await this.execute(candidate);
      return true;
    } finally {
      await release();
    }
  }

  newState(loaded, branch) {
    const n = nowIso();
    return {
      schemaVersion: 1,
      goalId: loaded.manifest.goalId,
      manifestSha256: loaded.sha256,
      lastConsumedRevision: loaded.manifest.revision,
      workBranch: branch,
      startedAt: n,
      updatedAt: n,
      status: 'running',
      completedTasks: [],
      completedPhases: [],
      taskRuns: []
    };
  }

  assertStateCompatible(m, s) {
    const taskIds = new Set(m.phases.flatMap(p => p.tasks.map(t => t.id)));
    const phaseIds = new Set(m.phases.map(p => p.id));
    for (const id of s.completedTasks ?? []) {
      if (!taskIds.has(id)) throw new Error(`Manifest revision removed previously completed task '${id}'. Create a new goalId or restore the task.`);
    }
    for (const id of s.completedPhases ?? []) {
      if (!phaseIds.has(id)) throw new Error(`Manifest revision removed previously completed phase '${id}'. Create a new goalId or restore the phase.`);
    }
  }

  async execute(loaded) {
    const m = loaded.manifest;
    const e = m.execution ?? {};
    const remote = e.remote ?? this.config.controlRemote;
    const base = e.baseBranch ?? this.config.controlBranch;
    const branch = e.workBranch ?? `gptgrill-codexwork/${slug(m.goalId)}`;
    const push = e.autoPush ?? true;
    const max = e.maxReviewIterations ?? 5;
    const phaseReview = e.phaseReview ?? true;
    const finalReview = e.finalReview ?? true;

    if (remote !== this.config.controlRemote) await this.git.fetch(remote);
    await this.git.checkoutBase(base, remote);
    await this.git.ensureWorkBranch(branch, base, remote);
    await this.git.mergeBase(base);

    let s = await readState(this.config.stateDir, this.config.workspace, m.goalId);
    if (!s) s = this.newState(loaded, branch);
    else {
      this.assertStateCompatible(m, s);
      s.manifestSha256 = loaded.sha256;
      s.lastConsumedRevision = m.revision;
      s.workBranch = branch;
      s.status = 'running';
      s.lastError = undefined;
      s.updatedAt = nowIso();
    }
    await writeState(this.config.stateDir, this.config.workspace, s);

    for (const p of m.phases) {
      if (s.completedPhases.includes(p.id)) continue;
      s.currentPhaseId = p.id;
      await writeState(this.config.stateDir, this.config.workspace, s);

      const incomplete = p.tasks.filter(t => !s.completedTasks.includes(t.id));
      if (m.mode === 'task' && incomplete.length) {
        await this.runTask(m, p, incomplete[0], s, remote, push, max);
        const phaseStillIncomplete = p.tasks.some(t => !s.completedTasks.includes(t.id));
        if (phaseStillIncomplete) {
          await this.pause(s, 'task-boundary');
          return;
        }
      } else {
        for (const t of incomplete) await this.runTask(m, p, t, s, remote, push, max);
      }

      if (phaseReview) {
        const r = await runCodex(this.config.workspace, this.config.codexCommand, this.config.defaultCodexArgs, m, phaseReviewPrompt(m, p, max));
        if (!r.ok) await this.block(s, `Phase review blocked/failed for ${p.id}`, r.stderr || r.stdout);
        const c = await this.git.commitAll(`fix(${m.goalId}): ${p.id} integration review`);
        if (c && push) await this.git.push(remote, branch);
      }

      if (!s.completedPhases.includes(p.id)) s.completedPhases.push(p.id);
      await writePhaseReport(this.config.workspace, m, p, s, { phaseReview });
      await this.git.commitAll(`docs(${m.goalId}): ${p.id} phase report`);
      if (push) await this.git.push(remote, branch);
      s.currentPhaseId = undefined;
      s.updatedAt = nowIso();
      await writeState(this.config.stateDir, this.config.workspace, s);

      const allPhasesComplete = m.phases.every(x => s.completedPhases.includes(x.id));
      if ((m.mode === 'task' || m.mode === 'phase') && !allPhasesComplete) {
        await this.pause(s, 'phase-boundary');
        return;
      }
    }

    await this.finishGoal(m, s, remote, push, max, finalReview);
  }

  async runTask(m, p, t, s, remote, push, max) {
    for (const f of [m.spec, t.file]) {
      if (!(await pathExists(path.join(this.config.workspace, f)))) await this.block(s, `Required file missing: ${f}`);
    }

    s.currentTaskId = t.id;
    s.taskRuns.push({ taskId: t.id, phaseId: p.id, startedAt: nowIso(), status: 'running' });
    s.updatedAt = nowIso();
    await writeState(this.config.stateDir, this.config.workspace, s);

    const r = await runCodex(this.config.workspace, this.config.codexCommand, this.config.defaultCodexArgs, m, taskPrompt(m, p, t, max));
    if (!r.ok) {
      const rec = s.taskRuns.at(-1);
      rec.status = 'blocked';
      rec.finishedAt = nowIso();
      rec.error = (r.stderr || r.stdout).slice(-4000);
      await this.block(s, `Task ${t.id} blocked/failed`, rec.error);
    }

    const files = await this.git.changedFiles();
    const c = await this.git.commitAll(`feat(${m.goalId}): ${t.id}`);
    if (push) await this.git.push(remote, s.workBranch);

    const rec = s.taskRuns.at(-1);
    rec.status = 'done';
    rec.finishedAt = nowIso();
    rec.changedFiles = files;
    rec.commit = c ?? await this.git.head();
    s.completedTasks.push(t.id);
    s.currentTaskId = undefined;
    s.updatedAt = nowIso();
    await writeState(this.config.stateDir, this.config.workspace, s);
  }

  async finishGoal(m, s, remote, push, max, doReview) {
    if (doReview) {
      const r = await runCodex(this.config.workspace, this.config.codexCommand, this.config.defaultCodexArgs, m, finalReviewPrompt(m, max));
      if (!r.ok) await this.block(s, `Final review blocked/failed for ${m.goalId}`, r.stderr || r.stdout);
      const c = await this.git.commitAll(`fix(${m.goalId}): final review`);
      if (c && push) await this.git.push(remote, s.workBranch);
    }

    s.status = 'done';
    s.currentPhaseId = undefined;
    s.currentTaskId = undefined;
    s.updatedAt = nowIso();
    await writeFinalReport(this.config.workspace, m, s, { finalReview: doReview });
    await this.git.commitAll(`docs(${m.goalId}): final report`);
    if (push) await this.git.push(remote, s.workBranch);
    await writeState(this.config.stateDir, this.config.workspace, s);
  }

  async pause(s, reason) {
    s.status = 'paused';
    s.pauseReason = reason;
    s.updatedAt = nowIso();
    await writeState(this.config.stateDir, this.config.workspace, s);
  }

  async block(s, msg, detail) {
    s.status = 'blocked';
    s.lastError = detail ? `${msg}\n${detail}` : msg;
    s.updatedAt = nowIso();
    await writeState(this.config.stateDir, this.config.workspace, s);
    throw new Error(s.lastError);
  }
}
