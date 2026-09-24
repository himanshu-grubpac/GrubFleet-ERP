process.env.NODE_ENV = 'test';
process.env.PORT = '4000';
process.env.API_PREFIX = 'api/v1';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.LOG_LEVEL = 'error';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-min-32-characters!!';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-min-32-characters!';
