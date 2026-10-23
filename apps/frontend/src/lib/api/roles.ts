import type {
  Role,
  PaginatedResponse,
  ModuleAccessLevel,
} from '@grubpac/shared-types';
import type { ListSortParams } from '@/lib/query/list-sort-params';
import { appendListSortSearchParams } from '@/lib/query/list-sort-params';
import { apiFetch } from './client';
import {
  DEFAULT_API_CATALOG_PAGE_SIZE,
  fetchAllPaginatedItems,
} from './fetch-all-paginated';

export type RoleEditorMatrixRow = {
  moduleId: string;
  label: string;
  sortOrder: number;
  allowedLevels: Array<'NONE' | 'VIEW' | 'MANAGE' | 'FULL'>;
  actorMaxLevel: ModuleAccessLevel;
  roleLevel: ModuleAccessLevel;
};

export type RoleEditorMatrixDto = {
  organizationId: string;
  roleId: string | null;
  modules: RoleEditorMatrixRow[];
};

export interface CreateRolePayload {
  organizationId: string;
  name: string;
  description?: string;
  /** Single parent role in org hierarchy (managed-by). */
  parentRoleId?: string | null;
  moduleAccess?: Array<{
    moduleId: string;
    accessLevel: 'VIEW' | 'MANAGE' | 'FULL';
  }>;
  permissionKeys?: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  isActive?: boolean;
  parentRoleId?: string | null;
  moduleAccess?: Array<{
    moduleId: string;
    accessLevel: 'VIEW' | 'MANAGE' | 'FULL';
  }>;
  permissionKeys?: string[];
}

export async function fetchRoleByIdApi(
  token: string,
  organizationId: string,
  roleId: string,
): Promise<Role> {
  const query = new URLSearchParams({ organizationId });

  return apiFetch<Role>(`/roles/${roleId}?${query.toString()}`, {
    method: 'GET',
    token,
    headers: {
      'x-organization-id': organizationId,
    },
  });
}

export async function fetchRolesApi(
  token: string,
  organizationId: string,
  page = 1,
  pageSize = 50,
  sort?: ListSortParams,
  search?: string,
): Promise<PaginatedResponse<Role>> {
  const query = new URLSearchParams({
    organizationId,
    page: String(page),
    pageSize: String(pageSize),
  });
  appendListSortSearchParams(query, sort);
  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    query.set('search', trimmedSearch);
  }

  return apiFetch<PaginatedResponse<Role>>(`/roles?${query.toString()}`, {
    method: 'GET',
    token,
    headers: {
      'x-organization-id': organizationId,
    },
  });
}

/** Loads every role page (page size 50) so catalogs and the roles list are not capped at one page. */
export async function fetchAllRolesApi(
  token: string,
  organizationId: string,
  sort?: ListSortParams,
  search?: string,
): Promise<Role[]> {
  return fetchAllPaginatedItems(
    (page, pageSize) =>
      fetchRolesApi(token, organizationId, page, pageSize, sort, search),
    DEFAULT_API_CATALOG_PAGE_SIZE,
  );
}

export async function fetchRoleEditorMatrixApi(
  token: string,
  organizationId: string,
  roleId?: string,
): Promise<RoleEditorMatrixDto> {
  const params: Record<string, string> = { organizationId };
  if (roleId) {
    params.roleId = roleId;
  }
  const query = new URLSearchParams(params);

  return apiFetch<RoleEditorMatrixDto>(`/roles/editor-matrix?${query.toString()}`, {
    method: 'GET',
    token,
    headers: {
      'x-organization-id': organizationId,
    },
  });
}

export async function createRoleApi(
  token: string,
  payload: CreateRolePayload,
): Promise<Role> {
  return apiFetch<Role>('/roles', {
    method: 'POST',
    token,
    headers: {
      'x-organization-id': payload.organizationId,
    },
    body: JSON.stringify(payload),
  });
}

export async function updateRoleApi(
  token: string,
  organizationId: string,
  roleId: string,
  payload: UpdateRolePayload,
): Promise<Role> {
  return apiFetch<Role>(`/roles/${roleId}`, {
    method: 'PATCH',
    token,
    headers: {
      'x-organization-id': organizationId,
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteRoleApi(
  token: string,
  organizationId: string,
  roleId: string,
): Promise<{ success: true }> {
  return apiFetch<{ success: true }>(`/roles/${roleId}`, {
    method: 'DELETE',
    token,
    headers: {
      'x-organization-id': organizationId,
    },
  });
}

export async function assignRoleApi(
  token: string,
  organizationId: string,
  roleId: string,
  userId: string,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/roles/${roleId}/assign`, {
    method: 'POST',
    token,
    headers: {
      'x-organization-id': organizationId,
    },
    body: JSON.stringify({ userId }),
  });
}

export async function unassignRoleApi(
  token: string,
  organizationId: string,
  roleId: string,
  userId: string,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/roles/${roleId}/assign`, {
    method: 'DELETE',
    token,
    headers: {
      'x-organization-id': organizationId,
    },
    body: JSON.stringify({ userId }),
  });
}
