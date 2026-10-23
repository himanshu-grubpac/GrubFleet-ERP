import { apiFetch, invalidateLocalSession } from './client';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
}

export async function changePasswordApi(
  token: string,
  payload: ChangePasswordPayload,
): Promise<{ success: true }> {
  const result = await apiFetch<{ success: true }>('/auth/change-password', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
  invalidateLocalSession();
  return result;
}

export async function forgotPasswordApi(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResponse> {
  return apiFetch<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resetPasswordApi(
  payload: ResetPasswordPayload,
): Promise<{ success: true }> {
  const result = await apiFetch<{ success: true }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  invalidateLocalSession();
  return result;
}
