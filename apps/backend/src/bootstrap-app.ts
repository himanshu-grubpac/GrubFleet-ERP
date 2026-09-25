import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import type { Env } from './config/env.schema';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { StructuredLoggerService } from './common/logger/structured-logger.service';

/**
 * Creates a configured Nest application (HTTP server not started).
 * Shared by local `main.ts` and AWS Lambda `lambda.ts`.
 */
export async function createNestApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Env, true>);
  const logger = app.get(StructuredLoggerService);
  app.useLogger(logger);

  const apiPrefix = config.get('API_PREFIX', { infer: true });
  app.setGlobalPrefix(apiPrefix);

  const corsOrigin = config.get('CORS_ORIGIN', { infer: true });
  app.enableCors({
    origin: corsOrigin.includes(',')
      ? corsOrigin.split(',').map((o) => o.trim())
      : corsOrigin,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'x-organization-id',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const appEnv = config.get('APP_ENV', { infer: true });
  if (appEnv === 'development') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('GrubPac ERP API')
      .setDescription('Modular monolith ERP platform — foundation API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  return app;
}
