import { creds } from './lib/creds.mjs';

// 1. verify github repo
const gh = await fetch('https://api.github.com/repos/cloudbrightio4/milford-carvanacars', {
  headers: { 'Authorization': `token ${creds.GITHUB_PAT}`, 'User-Agent': 'dsh-migration' },
});
const repo = await gh.json();
console.log('=== GITHUB ===');
console.log('repo:', repo.full_name, '| default branch:', repo.default_branch, '| pushed_at:', repo.pushed_at);

// 2. verify cloudflare token
const cfToken = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
  headers: { 'Authorization': `Bearer ${creds.CLOUDFLARE_API_TOKEN}` },
});
const tv = await cfToken.json();
console.log('\n=== CLOUDFLARE TOKEN ===');
console.log('status:', tv.success ? (tv.result?.status || 'ok') : 'FAIL', '| id:', tv.result?.id);

// 3. list pages projects
const acct = creds.CLOUDFLARE_ACCOUNT_ID;
const pages = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/pages/projects`, {
  headers: { 'Authorization': `Bearer ${creds.CLOUDFLARE_API_TOKEN}` },
});
const pj = await pages.json();
console.log('\n=== PAGES PROJECTS ===');
console.log('success:', pj.success, '| count:', pj.result?.length, '| errors:', JSON.stringify(pj.errors || []));
for (const p of pj.result || []) console.log('-', p.name, '|', p.subdomain || p.domains?.join(','), '| source:', JSON.stringify(p.source?.type || 'none'));
