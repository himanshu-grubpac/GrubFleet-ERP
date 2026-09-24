export const API_PREFIX = 'api/v1' as const;

export const routes = {
  health: {
    liveness: `/${API_PREFIX}/health`,
    readiness: `/${API_PREFIX}/health/ready`,
  },
  auth: {
    status: `/${API_PREFIX}/auth/status`,
    login: `/${API_PREFIX}/auth/login`,
    refresh: `/${API_PREFIX}/auth/refresh`,
    logout: `/${API_PREFIX}/auth/logout`,
    me: `/${API_PREFIX}/auth/me`,
  },
  organizations: {
    list: `/${API_PREFIX}/organizations`,
    byId: (id: string) => `/${API_PREFIX}/organizations/${id}`,
  },
  users: {
    list: `/${API_PREFIX}/users`,
    byId: (id: string) => `/${API_PREFIX}/users/${id}`,
  },
  permissions: {
    list: `/${API_PREFIX}/permissions`,
  },
  roles: {
    list: `/${API_PREFIX}/roles`,
    byId: (id: string) => `/${API_PREFIX}/roles/${id}`,
    assign: (id: string) => `/${API_PREFIX}/roles/${id}/assign`,
  },
  audit: {
    list: `/${API_PREFIX}/audit`,
  },
  modules: {
    list: `/${API_PREFIX}/modules`,
  },
  rolesEditorMatrix: `/${API_PREFIX}/roles/editor-matrix`,
} as const;

/** Paths with real backend behavior today. */
export const liveRoutes = [
  routes.health.liveness,
  routes.health.readiness,
  routes.auth.login,
  routes.auth.refresh,
  routes.auth.logout,
  routes.auth.me,
  routes.auth.status,
  routes.organizations.list,
  routes.users.list,
  routes.permissions.list,
  routes.roles.list,
  routes.rolesEditorMatrix,
  routes.modules.list,
  routes.audit.list,
] as const;

export const administrationPermissionKeys = [
  'administration.view',
  'administration.manage',
] as const;
