import type {
  Role,
  PaginatedResponse,
  ModuleAccessLevel,
} from '@grubpac/shared-types';
import { apiFetch } from './client';

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
  moduleAccess?: Array<{
    moduleId: string;
    accessLevel: 'VIEW' | 'MANAGE' | 'FULL';
  }>;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  moduleAccess?: Array<{
    moduleId: string;
    accessLevel: 'VIEW' | 'MANAGE' | 'FULL';
  }>;
}

export async function fetchRolesApi(
  token: string,
  organizationId: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<Role>> {
  const query = new URLSearchParams({
    organizationId,
    page: String(page),
    pageSize: String(pageSize),
  });

  return apiFetch<PaginatedResponse<Role>>(`/roles?${query.toString()}`, {
    method: 'GET',
    token,
    headers: {
      'x-organization-id': organizationId,
    },
  });
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
