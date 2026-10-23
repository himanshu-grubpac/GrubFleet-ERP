import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(16),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const logoutSchema = z.object({
  refreshToken: z.string().min(16).optional(),
});

export type LogoutInput = z.infer<typeof logoutSchema>;

export * from './geo';
export * from './vehicle-registration';
export * from './driver-license';
export * from './phone';
export * from './email';
export * from './gstin';
export * from './color-code';
export * from './chassis-vin';
export * from './cpr-no';
export * from './money';
export * from './calendar-date';
