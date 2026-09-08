import { creds } from './lib/creds.mjs';
const acct = creds.CLOUDFLARE_ACCOUNT_ID;
const H = { 'Authorization': `Bearer ${creds.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' };
const GH = { 'Authorization': `token ${creds.GITHUB_PAT}`, 'User-Agent': 'dsh-migration', 'Accept': 'application/vnd.github+json' };

// make repo public so Cloudflare Pages git-integration can reach it
const pub = await fetch('https://api.github.com/repos/cloudbrightio4/milford-carvanacars', {
  method: 'PATCH', headers: GH, body: JSON.stringify({ private: false }),
});
console.log('make public:', pub.status);

const body = {
  name: 'milford-carvanacars',
  production_branch: 'main',
  source: {
    type: 'github',
    config: {
      owner: 'cloudbrightio4',
      repo_name: 'milford-carvanacars',
      production_branch: 'main',
      deployments_enabled: true,
      production_deployments_enabled: true,
      preview_deployment_setting: 'all',
      preview_branch_includes: ['*'],
      preview_branch_excludes: [],
    },
  },
  build_config: { build_command: 'npm run build', destination_dir: 'dist', root_dir: '' },
};

const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/pages/projects`, {
  method: 'POST', headers: H, body: JSON.stringify(body),
});
const j = await r.json();
console.log('http status:', r.status, '| success:', j.success);
if (j.result) console.log('project:', j.result.name, '| url:', (j.result.subdomain ? j.result.subdomain + '.pages.dev' : j.result.domains?.join(',')));
if (j.errors) console.log('errors:', JSON.stringify(j.errors, null, 1));
if (!j.success) console.log(JSON.stringify(j, null, 1).slice(0, 900));
