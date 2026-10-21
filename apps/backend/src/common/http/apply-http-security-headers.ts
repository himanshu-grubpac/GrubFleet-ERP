import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/**
 * Security headers for API responses. CSP disabled (JSON API); CORS remains
 * configured separately in bootstrap-app.ts with credentials support.
 */
export function applyHttpSecurityHeaders(app: INestApplication): void {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
}
