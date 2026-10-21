import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { AuditModule } from '../audit/audit.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { AuthController } from './auth.controller';
import { AuthPasswordService } from './auth-password.service';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { PasswordResetNotificationService } from './password-reset-notification.service';
import { DEV_JWT_ACCESS_SECRET } from './constants/auth.constants';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { LoginRateLimiterService } from './login-rate-limiter.service';
import { parseDurationToSeconds } from './utils/duration.util';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const secret =
          config.get('JWT_ACCESS_SECRET', { infer: true }) ??
          DEV_JWT_ACCESS_SECRET;
        const expiresIn = parseDurationToSeconds(
          config.get('JWT_ACCESS_TTL', { infer: true }),
        );
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
    AuditModule,
    AuthorizationModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthPasswordService,
    PasswordResetNotificationService,
    AuthRepository,
    JwtStrategy,
    LoginRateLimiterService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, AuthRepository],
})
export class AuthModule {}
