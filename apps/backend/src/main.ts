import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { Env } from './config/env.schema';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { StructuredLoggerService } from './common/logger/structured-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Env, true>);
  const logger = app.get(StructuredLoggerService);
  app.useLogger(logger);

  const apiPrefix = config.get('API_PREFIX', { infer: true });
  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('GrubPac ERP API')
    .setDescription('Modular monolith ERP platform — foundation API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  logger.log(
    `Backend listening on port ${port}, prefix /${apiPrefix}`,
    'Bootstrap',
  );
}

void bootstrap();
