/** Dev DB policy: stable demo roles vs integration junk (no timestamp clutter). */

export const DEV_DEMO_ORG_ROLE_NAMES = [
  'Operations Manager',
  'Fleet Coordinator',
  'Organisation Analyst',
  'Workshop Lead',
  'Finance Reviewer',
] as const;

/** Stable roles created by integration specs (not deleted by junk purge). */
export const INTEGRATION_FIXTURE_ORG_ROLE_NAMES = [
  'Organization Admin',
  'RBAC Viewer Only',
  'Fleet View Only',
  'Organisation View Only',
] as const;

export const RBAC_INTEGRATION_TEST_ROLE_PREFIX = 'integration.test.rbac.';

const JUNK_ROLE_NAME_PREFIXES = [
  'Get By Id ',
  'Lifecycle ',
  'Integration Role ',
  'Fleet View Role ',
  'Fleet Manage Role ',
  'Should Fail ',
  'Admin Manage Only ',
  'Hierarchy Root ',
  'Hierarchy Mid ',
  'Hierarchy Leaf ',
  'Hierarchy Root Blocked ',
] as const;

const TIMESTAMP_SUFFIX = /\s+\d{10,}$/;

const KEEP_ORG_ROLE_NAMES = new Set<string>([
  ...DEV_DEMO_ORG_ROLE_NAMES,
  ...INTEGRATION_FIXTURE_ORG_ROLE_NAMES,
]);

export function rbacIntegrationTestRoleName(suffix: string): string {
  return `${RBAC_INTEGRATION_TEST_ROLE_PREFIX}${suffix}`;
}

export function isOrgRoleNameKeptInDev(name: string): boolean {
  return KEEP_ORG_ROLE_NAMES.has(name);
}

/** True when role name looks like integration litter (timestamp suffix or known test prefix). */
export function isJunkIntegrationOrgRoleName(name: string): boolean {
  if (isOrgRoleNameKeptInDev(name)) {
    return false;
  }
  if (name.startsWith(RBAC_INTEGRATION_TEST_ROLE_PREFIX)) {
    return true;
  }
  if (TIMESTAMP_SUFFIX.test(name)) {
    return true;
  }
  if (name.endsWith(' Viewer Only') && name !== 'Organisation View Only') {
    return true;
  }
  return JUNK_ROLE_NAME_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export type DevDemoOrgRoleSpec = {
  name: (typeof DEV_DEMO_ORG_ROLE_NAMES)[number];
  description: string;
  permissionKeys: string[];
};

export const DEV_DEMO_ORG_ROLE_SPECS: DevDemoOrgRoleSpec[] = [
  {
    name: 'Operations Manager',
    description: 'Day-to-day organisation operations (dev sample)',
    permissionKeys: [
      'dashboard.view',
      'organisation.view',
      'organisation.create',
      'organisation.update',
    ],
  },
  {
    name: 'Fleet Coordinator',
    description: 'Fleet leasing read + organisation directory (dev sample)',
    permissionKeys: [
      'dashboard.view',
      'fleet_leasing.view',
      'organisation.view',
    ],
  },
  {
    name: 'Organisation Analyst',
    description: 'Read-only organisation and administration audit (dev sample)',
    permissionKeys: [
      'dashboard.view',
      'organisation.view',
      'administration.view',
    ],
  },
  {
    name: 'Workshop Lead',
    description: 'Workshop module view (dev sample)',
    permissionKeys: ['dashboard.view', 'workshop.view'],
  },
  {
    name: 'Finance Reviewer',
    description: 'Finance read access (dev sample)',
    permissionKeys: ['dashboard.view', 'finance.view', 'organisation.view'],
  },
];
