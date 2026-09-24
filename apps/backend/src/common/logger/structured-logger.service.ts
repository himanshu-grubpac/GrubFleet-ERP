import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private readonly level: LogLevel;

  constructor(private readonly config: ConfigService<Env, true>) {
    const configured = this.config.get('LOG_LEVEL', { infer: true });
    this.level = configured === 'debug' ? 'debug' : 'log';
  }

  log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    if (this.level === 'debug') {
      this.write('debug', message, context);
    }
  }

  verbose(message: unknown, context?: string): void {
    this.debug(message, context);
  }

  private write(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    const entry = {
      level,
      timestamp: new Date().toISOString(),
      context,
      message: typeof message === 'string' ? message : message,
      trace,
    };

    console.log(JSON.stringify(entry));
  }
}
