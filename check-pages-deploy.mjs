import { creds } from './lib/creds.mjs';
const acct = creds.CLOUDFLARE_ACCOUNT_ID;
const H = { 'Authorization': `Bearer ${creds.CLOUDFLARE_API_TOKEN}` };

const p = await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/pages/projects/milford-carvanacars`, { headers: H })).json();
console.log('=== PROJECT ===');
console.log('subdomain:', p.result?.subdomain, '| domains:', JSON.stringify(p.result?.domains), '| canonical:', p.result?.canonical_deployment?.url);

const d = await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/pages/projects/milford-carvanacars/deployments`, { headers: H })).json();
console.log('\n=== DEPLOYMENTS ===');
for (const dep of (d.result || []).slice(0, 5)) {
  console.log(`- ${dep.id?.slice(0, 12)} | env=${dep.environment} | stage=${dep.latest_stage?.name} | status=${dep.latest_stage?.status} | ${dep.url}`);
}
