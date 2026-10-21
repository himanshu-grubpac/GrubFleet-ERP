import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';

@Injectable()
export class PasswordResetNotificationService {
  private readonly logger = new Logger(PasswordResetNotificationService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async sendPasswordResetLink(
    email: string,
    plainToken: string,
    expiresAt: Date,
  ): Promise<void> {
    const mode = this.config.get('PASSWORD_RESET_EMAIL_MODE', {
      infer: true,
    });
    const portalBase = this.config.get('PASSWORD_RESET_PORTAL_BASE_URL', {
      infer: true,
    });
    const resetPath =
      this.config.get('PASSWORD_RESET_PORTAL_PATH', { infer: true }) ??
      '/login/reset-password';
    const resetUrl = `${portalBase.replace(/\/$/, '')}${resetPath}?token=${encodeURIComponent(plainToken)}`;

    if (mode === 'webhook') {
      const webhookUrl = this.config.get('PASSWORD_RESET_WEBHOOK_URL', {
        infer: true,
      });
      if (!webhookUrl) {
        this.logger.warn(
          'PASSWORD_RESET_EMAIL_MODE=webhook but PASSWORD_RESET_WEBHOOK_URL is unset; reset token stored only',
        );
        return;
      }
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          resetUrl,
          expiresAt: expiresAt.toISOString(),
          template: 'password_reset',
        }),
      });
      if (!res.ok) {
        this.logger.error(
          `Password reset webhook failed with status ${res.status}`,
        );
      }
      return;
    }

    this.logger.log(
      `Password reset queued (log mode) for ${email}; expires ${expiresAt.toISOString()}. Configure PASSWORD_RESET_EMAIL_MODE=webhook for delivery.`,
    );
    if (this.config.get('APP_ENV', { infer: true }) === 'development') {
      this.logger.debug(
        `Dev reset URL (do not use in production logs): ${resetUrl}`,
      );
    }
  }
}
