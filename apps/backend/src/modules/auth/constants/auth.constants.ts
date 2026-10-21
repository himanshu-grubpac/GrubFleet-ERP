export const AUTH_AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',
  REFRESH: 'AUTH_TOKEN_REFRESH',
  LOGOUT: 'AUTH_LOGOUT',
  CHANGE_PASSWORD_SUCCESS: 'AUTH_CHANGE_PASSWORD_SUCCESS',
  CHANGE_PASSWORD_FAILURE: 'AUTH_CHANGE_PASSWORD_FAILURE',
  FORGOT_PASSWORD_REQUEST: 'AUTH_FORGOT_PASSWORD_REQUEST',
  RESET_PASSWORD_SUCCESS: 'AUTH_RESET_PASSWORD_SUCCESS',
  RESET_PASSWORD_FAILURE: 'AUTH_RESET_PASSWORD_FAILURE',
} as const;

/** Matches login DTO @MinLength(8) and dev seed policy. */
export const PASSWORD_MIN_LENGTH = 8;
export const BCRYPT_ROUNDS = 12;

export const PASSWORD_RESET_TOKEN_TTL_SEC_DEFAULT = 3600;

export const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'If an account exists for this email, password reset instructions will be sent.';

export const FORGOT_PASSWORD_RATE_LIMIT_MAX = 5;
export const CHANGE_PASSWORD_RATE_LIMIT_MAX = 10;

/** Non-production fallback when JWT_*_SECRET is unset (never used when APP_ENV=production). */
export const DEV_JWT_ACCESS_SECRET =
  'dev-only-access-secret-min-32-characters!!';
export const DEV_JWT_REFRESH_SECRET =
  'dev-only-refresh-secret-min-32-characters!';

// Original defaults (commented out for testing):
// export const LOGIN_RATE_LIMIT_MAX = 10;
// export const LOGIN_RATE_LIMIT_WINDOW_SEC = 900; // 15 minutes

// Temporary settings for testing:
export const LOGIN_RATE_LIMIT_MAX = 20;
export const LOGIN_RATE_LIMIT_WINDOW_SEC = 900; // 15 minutes (adjust as needed for testing)
