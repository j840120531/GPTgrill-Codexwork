import { execFile } from './process.js';

export class Git {
  constructor(cwd) { this.cwd = cwd; }

  async run(args, allowFailure = false) {
    const r = await execFile('git', args, { cwd: this.cwd });
    if (r.code !== 0 && !allowFailure) {
      throw new Error(`git ${args.join(' ')} failed (${r.code}): ${r.stderr.trim()}`);
    }
    return r.stdout.trim();
  }

  async isRepo() {
    const r = await execFile('git', ['rev-parse', '--is-inside-work-tree'], { cwd: this.cwd });
    return r.code === 0 && r.stdout.trim() === 'true';
  }

  async currentBranch() { return await this.run(['branch', '--show-current']); }

  async assertClean() {
    const s = await this.run(['status', '--porcelain']);
    if (s) throw new Error('Workspace has uncommitted changes. Commit/stash them before GPTgrill-Codexwork runs.');
  }

  async fetch(remote) { await this.run(['fetch', '--prune', remote]); }

  async checkout(branch) { await this.run(['checkout', branch]); }

  async checkoutBase(base, remote) {
    const local = (await execFile('git', ['show-ref', '--verify', '--quiet', `refs/heads/${base}`], { cwd: this.cwd })).code === 0;
    if (local) await this.checkout(base);
    else await this.run(['checkout', '-b', base, `${remote}/${base}`]);
    await this.run(['pull', '--ff-only', remote, base]);
  }

  async ensureWorkBranch(branch, base, remote) {
    const local = (await execFile('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { cwd: this.cwd })).code === 0;
    if (local) { await this.checkout(branch); return; }
    const remoteBranch = (await execFile('git', ['show-ref', '--verify', '--quiet', `refs/remotes/${remote}/${branch}`], { cwd: this.cwd })).code === 0;
    if (remoteBranch) await this.run(['checkout', '-b', branch, `${remote}/${branch}`]);
    else await this.run(['checkout', '-b', branch, base]);
  }

  async mergeBase(base) {
    const r = await execFile('git', ['merge', '--no-edit', base], { cwd: this.cwd });
    if (r.code === 0) return;
    await execFile('git', ['merge', '--abort'], { cwd: this.cwd });
    throw new Error(`Could not merge updated control/base branch ${base} into the goal branch: ${r.stderr.trim() || r.stdout.trim()}`);
  }

  async listFiles(ref, prefix) {
    const r = await execFile('git', ['ls-tree', '-r', '--name-only', ref, '--', prefix], { cwd: this.cwd });
    if (r.code !== 0) return [];
    return r.stdout.split('\n').map(x => x.trim()).filter(Boolean);
  }

  async show(ref, filePath) {
    const r = await execFile('git', ['show', `${ref}:${filePath}`], { cwd: this.cwd });
    if (r.code !== 0) throw new Error(`Cannot read ${filePath} from ${ref}: ${r.stderr.trim()}`);
    return r.stdout;
  }

  async changedFiles() {
    const out = await this.run(['status', '--porcelain']);
    if (!out) return [];
    return out.split('\n').map(x => x.slice(3).trim()).filter(Boolean);
  }

  async hasChanges() { return (await this.changedFiles()).length > 0; }

  async commitAll(message) {
    if (!(await this.hasChanges())) return undefined;
    await this.run(['add', '-A']);
    await this.run(['commit', '-m', message]);
    return await this.run(['rev-parse', 'HEAD']);
  }

  async head() { return await this.run(['rev-parse', 'HEAD']); }

  async push(remote, branch) { await this.run(['push', '-u', remote, branch]); }
}
