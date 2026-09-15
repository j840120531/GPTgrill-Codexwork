import { spawn } from 'node:child_process';

const MAX_CAPTURE = 4 * 1024 * 1024;
const appendTail = (current, chunk) => {
  const next = current + chunk;
  return next.length > MAX_CAPTURE ? next.slice(-MAX_CAPTURE) : next;
};

export async function execFile(command, args, opts = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: opts.cwd, env: opts.env ?? process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', d => { stdout = appendTail(stdout, d); process.stdout.write(d); });
    child.stderr.on('data', d => { stderr = appendTail(stderr, d); process.stderr.write(d); });
    child.on('error', reject);
    child.stdin.on('error', error => { if (error?.code !== 'EPIPE') reject(error); });
    child.on('close', code => resolve({ code: code ?? 1, stdout, stderr }));
    child.stdin.end(opts.stdin ?? '');
  });
}
