import { ConfigService } from '@nestjs/config';
import { createNestApplication } from './bootstrap-app';
import type { Env } from './config/env.schema';
import { StructuredLoggerService } from './common/logger/structured-logger.service';

async function bootstrap(): Promise<void> {
  const app = await createNestApplication();
  const config = app.get(ConfigService<Env, true>);
  const logger = app.get(StructuredLoggerService);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  const apiPrefix = config.get('API_PREFIX', { infer: true });
  logger.log(
    `Backend listening on port ${port}, prefix /${apiPrefix}`,
    'Bootstrap',
  );
}

void bootstrap();
