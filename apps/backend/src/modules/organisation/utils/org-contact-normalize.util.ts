import { normalizePhoneForStorage } from '@grubpac/validation';

export function normalizeOrgContactEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeOrgContactPhone(phone: string): string {
  const trimmed = phone.trim();
  const normalized = normalizePhoneForStorage(trimmed);
  return normalized || trimmed;
}
