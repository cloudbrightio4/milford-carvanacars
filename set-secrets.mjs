import sodium from 'libsodium-wrappers';
import { creds } from './lib/creds.mjs';

await sodium.ready;

const owner = 'cloudbrightio4';
const repo = 'milford-carvanacars';
const GH = {
  'Authorization': `token ${creds.GITHUB_PAT}`,
  'User-Agent': 'dsh-migration',
  'Accept': 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
};

// check token scopes
const me = await fetch('https://api.github.com/user', { headers: GH });
console.log('token scopes:', me.headers.get('x-oauth-scopes') || '(none returned)');

async function setSecret(name, value) {
  const pkResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`, { headers: GH });
  if (pkResp.status !== 200) { console.log(`public-key fetch failed: ${pkResp.status}`); return; }
  const pk = await pkResp.json();
  const key = sodium.from_base64(pk.key, sodium.base64_variants.ORIGINAL);
  const enc = sodium.crypto_box_seal(sodium.from_string(value), key);
  const body = { encrypted_value: sodium.to_base64(enc, sodium.base64_variants.ORIGINAL), key_id: pk.key_id };
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/${name}`, {
    method: 'PUT', headers: GH, body: JSON.stringify(body),
  });
  console.log(`set secret ${name} -> ${r.status}`);
  if (r.status !== 201 && r.status !== 204) console.log(await r.text());
}

await setSecret('CLOUDFLARE_API_TOKEN', creds.CLOUDFLARE_API_TOKEN);
await setSecret('CLOUDFLARE_ACCOUNT_ID', creds.CLOUDFLARE_ACCOUNT_ID);
