import type { AuthTokenPair, AuthMeResponse } from '@grubpac/shared-types';
import { apiFetch } from './client';

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Authenticates the user with email and password.
 * Returns access token and refresh token.
 */
export async function loginApi(credentials: LoginCredentials): Promise<AuthTokenPair> {
  return apiFetch<AuthTokenPair>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/**
 * Exchanges a refresh token for a new access & refresh token pair.
 */
export async function refreshApi(refreshToken: string): Promise<AuthTokenPair> {
  return apiFetch<AuthTokenPair>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

/**
 * Revokes the current session / refresh token.
 */
export async function logoutApi(token?: string, refreshToken?: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/auth/logout', {
    method: 'POST',
    token,
    body: JSON.stringify({ refreshToken }),
  });
}

/**
 * Fetches the currently authenticated user profile, active organization,
 * effective permission keys, and module-level access.
 */
export async function getMeApi(token: string): Promise<AuthMeResponse> {
  return apiFetch<AuthMeResponse>('/auth/me', {
    method: 'GET',
    token,
  });
}
