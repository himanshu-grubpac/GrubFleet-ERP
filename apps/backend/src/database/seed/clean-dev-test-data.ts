/**
 * Dev-only: purge integration junk (RBAC roles + org submodule test rows) and reseed demo data.
 *
 * Prefer: node scripts/dev-clean-test-roles.mjs
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import {
  assertDevOnly,
  cleanDevRbacTestArtifacts,
  maskDatabaseUrl,
  resolveDevDatabaseUrl,
  resolveDevOrganizationId,
} from './organisation-dev-data-guards';
import { DEV_DEMO_ORG_ROLE_NAMES } from './dev-role-data-policy';
import { seedDevOrgDemoRoles } from './seed-dev-org-roles';

function runSeedScript(scriptBaseName: string): void {
  const backendRoot = path.resolve(__dirname, '../../..');
  const scriptPath = path.join(
    backendRoot,
    'src/database/seed',
    `${scriptBaseName}.ts`,
  );
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const quotedScript = `"${scriptPath}"`;
  const result = spawnSync(
    `${npm} exec -- ts-node -r tsconfig-paths/register ${quotedScript} --confirm-dev`,
    [],
    {
      cwd: backendRoot,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, APP_ENV: process.env.APP_ENV ?? 'development' },
    },
  );
  if (result.status !== 0) {
    throw new Error(`${scriptBaseName} failed with exit ${result.status ?? 1}`);
  }
}

async function main(): Promise<void> {
  const skipOrg = process.argv.includes('--skip-organisation');
  const connectionString = resolveDevDatabaseUrl();
  assertDevOnly(connectionString);

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });
  const devOrgId = await resolveDevOrganizationId(db);

  const rbacResult = await cleanDevRbacTestArtifacts(db, devOrgId);
  await pool.end();

  console.log(
    JSON.stringify(
      {
        phase: 'rbac-clean',
        connection: maskDatabaseUrl(connectionString),
        rbac: rbacResult,
      },
      null,
      2,
    ),
  );

  if (!skipOrg) {
    runSeedScript('clean-organisation-locations-dev');
    runSeedScript('clean-organisation-employees-dev');
    runSeedScript('clean-organisation-suppliers-dev');
    runSeedScript('clean-organisation-clients-dev');
    runSeedScript('clean-organisation-drivers-dev');
  }

  const pool2 = new Pool(pgPoolOptions(connectionString));
  const db2 = drizzle(pool2, { schema });
  const orgId = await resolveDevOrganizationId(db2);
  const seededRoleNames = await seedDevOrgDemoRoles(db2, orgId);
  await pool2.end();

  if (!skipOrg) {
    runSeedScript('seed-organisation-sample-dev');
  }

  console.log(
    JSON.stringify(
      {
        phase: 'complete',
        demoRoleNames: DEV_DEMO_ORG_ROLE_NAMES,
        seededRoleNames,
      },
      null,
      2,
    ),
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
