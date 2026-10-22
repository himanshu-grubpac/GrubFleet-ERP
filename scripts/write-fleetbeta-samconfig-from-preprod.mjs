import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let c = readFileSync(join(root, 'samconfig.preprod.toml'), 'utf8');
c = c
  .replace(/grubfleet-api-preprod/g, 'grubfleet-api-fleetbeta')
  .replace(/AppEnv=\\"preprod\\"/, 'AppEnv=\\"fleetbeta\\"')
  .replace(/grubfleet_erp_preprod/g, 'grubfleet_erp_fleet_beta')
  .replace(/grubfleet-preprod-redis/g, 'grubfleet-fleetbeta-redis')
  .replace(/d2fyfrapktmstq\.cloudfront\.net/g, 'd206aq3nodl3r1.cloudfront.net');
writeFileSync(join(root, 'samconfig.fleetbeta.toml'), c, 'utf8');
console.log('Wrote samconfig.fleetbeta.toml');
