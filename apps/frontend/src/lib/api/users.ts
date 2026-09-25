import type {
  PaginatedResponse,
  UserMember,
  CreateUserResponse,
  Organization,
  AuditLogEntry,
} from '@grubpac/shared-types';
import { apiFetch } from './client';

export interface CreateUserPayload {
  organizationId: string;
  email: string;
  fullName?: string;
  password?: string;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  fullName?: string;
  isActive?: boolean;
  password?: string;
}

export async function fetchOrganizationApi(
  token: string,
  organizationId: string,
): Promise<Organization> {
  return apiFetch<Organization>(`/organizations/${organizationId}`, {
    method: 'GET',
    token,
  });
}

export async function fetchUsersApi(
  token: string,
  organizationId: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<UserMember>> {
  const query = new URLSearchParams({
    organizationId,
    page: String(page),
    pageSize: String(pageSize),
  });

  return apiFetch<PaginatedResponse<UserMember>>(`/users?${query.toString()}`, {
    method: 'GET',
    token,
    headers: {
      'x-organization-id': organizationId,
    },
  });
}

export async function createUserApi(
  token: string,
  payload: CreateUserPayload,
): Promise<CreateUserResponse> {
  return apiFetch<CreateUserResponse>('/users', {
    method: 'POST',
    token,
    headers: {
      'x-organization-id': payload.organizationId,
    },
    body: JSON.stringify(payload),
  });
}

export async function updateUserApi(
  token: string,
  organizationId: string,
  userId: string,
  payload: UpdateUserPayload,
): Promise<UserMember> {
  return apiFetch<UserMember>(`/users/${userId}`, {
    method: 'PATCH',
    token,
    headers: {
      'x-organization-id': organizationId,
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchAuditLogsApi(
  token: string,
  organizationId: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<AuditLogEntry>> {
  const query = new URLSearchParams({
    organizationId,
    page: String(page),
    pageSize: String(pageSize),
  });

  return apiFetch<PaginatedResponse<AuditLogEntry>>(`/audit?${query.toString()}`, {
    method: 'GET',
    token,
    headers: {
      'x-organization-id': organizationId,
    },
  });
}
