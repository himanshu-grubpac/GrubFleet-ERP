export const AUTH_AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',
  REFRESH: 'AUTH_TOKEN_REFRESH',
  LOGOUT: 'AUTH_LOGOUT',
} as const;

/** Non-production fallback when JWT_*_SECRET is unset (never used when APP_ENV=production). */
export const DEV_JWT_ACCESS_SECRET =
  'dev-only-access-secret-min-32-characters!!';
export const DEV_JWT_REFRESH_SECRET =
  'dev-only-refresh-secret-min-32-characters!';

export const LOGIN_RATE_LIMIT_MAX = 10;
export const LOGIN_RATE_LIMIT_WINDOW_SEC = 900;
