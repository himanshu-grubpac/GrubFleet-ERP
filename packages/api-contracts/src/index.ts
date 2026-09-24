export const API_PREFIX = 'api/v1' as const;

export const routes = {
  health: {
    liveness: `/${API_PREFIX}/health`,
    readiness: `/${API_PREFIX}/health/ready`,
  },
  auth: {
    status: `/${API_PREFIX}/auth/status`,
  },
  users: { status: `/${API_PREFIX}/users/status` },
  organizations: { status: `/${API_PREFIX}/organizations/status` },
  roles: { status: `/${API_PREFIX}/roles/status` },
  permissions: { status: `/${API_PREFIX}/permissions/status` },
  audit: { status: `/${API_PREFIX}/audit/status` },
} as const;

/** Paths with real backend behavior today (not `implemented: false` stubs). */
export const liveRoutes = [routes.health.liveness, routes.health.readiness] as const;
