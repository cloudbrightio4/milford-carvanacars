import { creds } from './lib/creds.mjs';
const acct = creds.CLOUDFLARE_ACCOUNT_ID;
const H = { 'Authorization': `Bearer ${creds.CLOUDFLARE_API_TOKEN}` };

const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/pages/projects/carsales-frontend`, { headers: H });
const j = await r.json();
console.log('success', j.success);
const p = j.result;
if (p) {
  console.log('name:', p.name, '| production_branch:', p.production_branch);
  console.log('source:', JSON.stringify(p.source, null, 1));
  console.log('build_config:', JSON.stringify(p.build_config, null, 1));
  console.log('deployment_configs keys:', Object.keys(p.deployment_configs || {}));
}
