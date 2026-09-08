import { creds } from './lib/creds.mjs';
const GH = { 'Authorization': `token ${creds.GITHUB_PAT}`, 'User-Agent': 'dsh-migration', 'Accept': 'application/vnd.github+json' };

const repos = await (await fetch('https://api.github.com/user/repos?per_page=100', { headers: GH })).json();
console.log('=== cloudbrightio4 REPOS ===');
for (const r of repos) console.log('-', r.name, '| private:', r.private, '| pushed:', r.pushed_at);

// check hooks on carsales-frontend (existing github-source project) if present
const cf = repos.find((r) => r.name === 'carsales-frontend');
if (cf) {
  const hooks = await (await fetch(`https://api.github.com/repos/cloudbrightio4/carsales-frontend/hooks`, { headers: GH })).json();
  console.log('\n=== carsales-frontend HOOKS ===');
  if (Array.isArray(hooks)) {
    console.log('count:', hooks.length);
    for (const h of hooks) console.log('-', h.name, '|', (h.config?.url || '').slice(0, 80), '| active:', h.active);
  } else console.log(JSON.stringify(hooks).slice(0, 300));
}
