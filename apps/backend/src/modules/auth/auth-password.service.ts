import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuthRepository } from './auth.repository';
import {
  AUTH_AUDIT_ACTIONS,
  FORGOT_PASSWORD_GENERIC_MESSAGE,
  PASSWORD_RESET_TOKEN_TTL_SEC_DEFAULT,
} from './constants/auth.constants';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ForgotPasswordResponseDto } from './dto/password-flow-response.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginRateLimiterService } from './login-rate-limiter.service';
import { PasswordResetNotificationService } from './password-reset-notification.service';
import {
  assertNewPasswordDistinctFromCurrent,
  assertPasswordMeetsPolicy,
  hashPassword,
  verifyPassword,
} from './utils/password-policy.util';
import { generateOpaqueToken, hashOpaqueToken } from './utils/token-hash.util';
import type { Env } from '../../config/env.schema';

@Injectable()
export class AuthPasswordService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly auditService: AuditService,
    private readonly loginRateLimiter: LoginRateLimiterService,
    private readonly passwordResetNotification: PasswordResetNotificationService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    req: Request,
  ): Promise<{ success: true }> {
    await this.loginRateLimiter.assertScopeAllowed(
      'change_password',
      userId,
      req.ip,
    );

    const user = await this.authRepository.findUserById(userId);
    if (!user?.isActive || !user.passwordHash) {
      throw new ForbiddenException({
        message: 'Account is not active',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    const currentOk = await verifyPassword(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!currentOk) {
      await this.auditService.log({
        userId,
        action: AUTH_AUDIT_ACTIONS.CHANGE_PASSWORD_FAILURE,
        status: 'FAILURE',
        metadata: { reason: 'invalid_current_password' },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });
      throw new UnauthorizedException({
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD',
      });
    }

    assertPasswordMeetsPolicy(dto.newPassword);
    await assertNewPasswordDistinctFromCurrent(
      dto.newPassword,
      user.passwordHash,
    );

    const passwordHash = await hashPassword(dto.newPassword);
    await this.authRepository.updateUserPasswordHash(userId, passwordHash);
    await this.authRepository.revokeAllRefreshTokensForUser(userId);
    await this.authRepository.invalidateUnusedPasswordResetTokensForUser(
      userId,
    );

    await this.auditService.log({
      userId,
      action: AUTH_AUDIT_ACTIONS.CHANGE_PASSWORD_SUCCESS,
      resourceType: 'user',
      resourceId: userId,
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    return { success: true };
  }

  async forgotPassword(
    email: string,
    req: Request,
  ): Promise<ForgotPasswordResponseDto> {
    const normalized = email.trim().toLowerCase();
    await this.loginRateLimiter.assertScopeAllowed(
      'forgot_password',
      normalized,
      req.ip,
    );

    const user = await this.authRepository.findUserByEmail(normalized);
    let resetToken: string | undefined;

    if (user?.isActive && user.passwordHash) {
      await this.authRepository.invalidateUnusedPasswordResetTokensForUser(
        user.id,
      );
      resetToken = generateOpaqueToken();
      const ttlSec =
        this.config.get('PASSWORD_RESET_TOKEN_TTL_SEC', { infer: true }) ??
        PASSWORD_RESET_TOKEN_TTL_SEC_DEFAULT;
      const expiresAt = new Date(Date.now() + ttlSec * 1000);
      await this.authRepository.insertPasswordResetToken({
        userId: user.id,
        tokenHash: hashOpaqueToken(resetToken),
        expiresAt,
        ipAddress: req.ip,
      });
      await this.passwordResetNotification.sendPasswordResetLink(
        user.email,
        resetToken,
        expiresAt,
      );
      await this.auditService.log({
        userId: user.id,
        action: AUTH_AUDIT_ACTIONS.FORGOT_PASSWORD_REQUEST,
        resourceType: 'user',
        resourceId: user.id,
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });
    }

    return {
      message: FORGOT_PASSWORD_GENERIC_MESSAGE,
      ...(process.env.PASSWORD_RESET_EXPOSE_TOKEN_FOR_TESTS === '1' &&
      resetToken
        ? { resetToken }
        : {}),
    };
  }

  async resetPassword(
    dto: ResetPasswordDto,
    req: Request,
  ): Promise<{ success: true }> {
    const tokenHash = hashOpaqueToken(dto.token);
    const row =
      await this.authRepository.findValidPasswordResetTokenByHash(tokenHash);

    if (!row) {
      await this.auditService.log({
        action: AUTH_AUDIT_ACTIONS.RESET_PASSWORD_FAILURE,
        status: 'FAILURE',
        metadata: { reason: 'invalid_or_expired_token' },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });
      throw new BadRequestException({
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN',
      });
    }

    const user = await this.authRepository.findUserById(row.userId);
    if (!user?.isActive) {
      await this.authRepository.markPasswordResetTokenUsed(row.id);
      throw new ForbiddenException({
        message: 'Account is not active',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    assertPasswordMeetsPolicy(dto.newPassword);
    await assertNewPasswordDistinctFromCurrent(
      dto.newPassword,
      user.passwordHash,
    );

    const passwordHash = await hashPassword(dto.newPassword);
    await this.authRepository.updateUserPasswordHash(user.id, passwordHash);
    await this.authRepository.markPasswordResetTokenUsed(row.id);
    await this.authRepository.revokeAllRefreshTokensForUser(user.id);
    await this.authRepository.invalidateUnusedPasswordResetTokensForUser(
      user.id,
    );

    await this.auditService.log({
      userId: user.id,
      action: AUTH_AUDIT_ACTIONS.RESET_PASSWORD_SUCCESS,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    return { success: true };
  }
}
