import type { PoolConfig } from 'pg';

/** RDS and other managed Postgres often use TLS with a chain Node rejects by default. */
export function pgPoolOptions(connectionString: string): PoolConfig {
  const needsRelaxedSsl =
    /sslmode=/i.test(connectionString) ||
    connectionString.includes('rds.amazonaws.com');

  if (!needsRelaxedSsl) {
    return { connectionString, max: 10 };
  }

  // pg v8 treats sslmode=require as verify-full; strip it and set ssl explicitly.
  const cleaned = connectionString
    .replace(
      /([?&])sslmode=[^&]*(&|$)/,
      (_m: string, sep: string, tail: string): string => {
        if (sep === '?' && tail) return '?';
        if (sep === '?') return '';
        return tail ? sep : '';
      },
    )
    .replace(/\?&/, '?')
    .replace(/\?$/, '');

  return {
    connectionString: cleaned,
    max: 10,
    ssl: { rejectUnauthorized: false },
  };
}
