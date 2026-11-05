// PostToolUse hook (Write|Edit): syntax-check the file Claude just changed.
// .js/.mjs/.cjs -> `node --check`; .json -> JSON.parse. On failure, tell Claude what broke so it fixes it.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const file = JSON.parse(input || '{}').tool_input?.file_path || '';

let problem = '';
if (/\.(m|c)?js$/i.test(file) && !/node_modules|[\\/]dist[\\/]/.test(file)) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) problem = (r.stderr || r.stdout).trim();
} else if (/\.json$/i.test(file) && !/node_modules|package-lock\.json$/.test(file)) {
  try {
    JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    problem = e.message;
  }
}

if (problem) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason: `Syntax error in ${file}:\n${problem.split('\n').slice(0, 8).join('\n')}` }));
}
