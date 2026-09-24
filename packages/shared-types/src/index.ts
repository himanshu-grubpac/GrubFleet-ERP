/** Cross-app DTO stubs — expand as API contracts stabilize. */
export type ApiErrorResponse = {
  message: string;
  code: string;
  statusCode: number;
  correlationId?: string;
  details?: unknown;
};

export type HealthLiveness = {
  status: string;
  service: string;
};

export type HealthReadiness = {
  status: string;
  checks: {
    database: string;
    redis: string;
    drizzle: string;
  };
};

/** Module scaffold ping — not a product API. */
export type ModuleStatus = {
  module: string;
  implemented: boolean;
  note?: string;
};
