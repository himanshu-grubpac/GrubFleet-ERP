import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuthRepository } from './auth.repository';
import { AUTH_AUDIT_ACTIONS } from './constants/auth.constants';
import type { LoginDto } from './dto/login.dto';
import {
  deriveModuleAccessFromKeysDetailed,
  maxModuleAccessLevel,
  moduleAccessForNav,
  type ModuleAccessLevel,
} from './authorization/module-access.util';
import { AuthorizationService } from './authorization/authorization.service';
import type { MeResponseDto } from './dto/me-response.dto';
import type { TokenPairResponseDto } from './dto/token-response.dto';
import { LoginRateLimiterService } from './login-rate-limiter.service';
import type { JwtAccessPayload } from './types/authenticated-user.type';
import { generateOpaqueToken, hashOpaqueToken } from './utils/token-hash.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly loginRateLimiter: LoginRateLimiterService,
  ) {}

  async login(
    dto: LoginDto,
    req: Request,
    accessTtlSec: number,
    refreshTtlSec: number,
  ): Promise<TokenPairResponseDto> {
    const email = dto.email.trim().toLowerCase();
    await this.loginRateLimiter.assertAllowed(email, req.ip);

    const user = await this.authRepository.findUserByEmail(email);
    const invalid = () =>
      new UnauthorizedException({
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });

    if (!user?.passwordHash || !user.isActive) {
      await this.auditService.log({
        action: AUTH_AUDIT_ACTIONS.LOGIN_FAILURE,
        status: 'FAILURE',
        metadata: { email, reason: 'invalid_credentials' },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });
      throw invalid();
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      await this.auditService.log({
        userId: user.id,
        action: AUTH_AUDIT_ACTIONS.LOGIN_FAILURE,
        status: 'FAILURE',
        metadata: { email, reason: 'invalid_password' },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });
      throw invalid();
    }

    const tokens = await this.issueTokenPair(
      user.id,
      user.email,
      accessTtlSec,
      refreshTtlSec,
      req,
    );

    await this.auditService.log({
      userId: user.id,
      action: AUTH_AUDIT_ACTIONS.LOGIN_SUCCESS,
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    return tokens;
  }

  async refresh(
    refreshToken: string,
    req: Request,
    accessTtlSec: number,
    refreshTtlSec: number,
  ): Promise<TokenPairResponseDto> {
    const tokenHash = hashOpaqueToken(refreshToken);
    const row =
      await this.authRepository.findValidRefreshTokenByHash(tokenHash);
    if (!row) {
      throw new UnauthorizedException({
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const user = await this.authRepository.findUserById(row.userId);
    if (!user?.isActive) {
      await this.authRepository.revokeRefreshTokenById(row.id);
      throw new ForbiddenException({
        message: 'Account is not active',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    await this.authRepository.revokeRefreshTokenById(row.id);

    const tokens = await this.issueTokenPair(
      user.id,
      user.email,
      accessTtlSec,
      refreshTtlSec,
      req,
    );

    await this.auditService.log({
      userId: user.id,
      action: AUTH_AUDIT_ACTIONS.REFRESH,
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    return tokens;
  }

  async logout(
    userId: string,
    refreshToken: string | undefined,
    req: Request,
  ): Promise<{ success: true }> {
    if (refreshToken) {
      await this.authRepository.revokeRefreshTokenByHash(
        hashOpaqueToken(refreshToken),
      );
    } else {
      await this.authRepository.revokeAllRefreshTokensForUser(userId);
    }

    await this.auditService.log({
      userId,
      action: AUTH_AUDIT_ACTIONS.LOGOUT,
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    return { success: true };
  }

  async getMe(userId: string): Promise<MeResponseDto> {
    const profile = await this.authRepository.getMeProfile(userId);
    if (!profile) {
      throw new UnauthorizedException({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    const memberships = await Promise.all(
      profile.memberships.map(async (m) => {
        const permissionKeys =
          await this.authorizationService.getEffectivePermissionKeys(
            userId,
            m.organizationId,
          );
        const permissionRevision =
          await this.authorizationService.getOrganizationPermissionRevision(
            m.organizationId,
          );
        return {
          organizationId: m.organizationId,
          organizationName: m.organizationName,
          organizationSlug: m.organizationSlug,
          status: m.status,
          joinedAt: m.joinedAt?.toISOString() ?? null,
          roles: m.roles,
          permissionKeys,
          permissionRevision,
          moduleAccess: moduleAccessForNav(permissionKeys).map((row) => ({
            moduleId: row.moduleId,
            accessLevel: row.accessLevel as
              'VIEW' | 'MANAGE' | 'FULL' | 'CUSTOM',
          })),
        };
      }),
    );

    const globalPermissionKeys = [
      ...new Set(memberships.flatMap((m) => m.permissionKeys)),
    ].sort();

    const globalModuleAccess = this.mergeModuleAccessAcrossOrgs(
      memberships.map((m) => m.permissionKeys),
    );

    return {
      user: {
        id: profile.user.id,
        email: profile.user.email,
        fullName: profile.user.fullName,
        isActive: profile.user.isActive,
        emailVerifiedAt: profile.user.emailVerifiedAt?.toISOString() ?? null,
      },
      memberships,
      permissionKeys: globalPermissionKeys,
      moduleAccess: globalModuleAccess,
    };
  }

  private mergeModuleAccessAcrossOrgs(permissionKeySets: string[][]): Array<{
    moduleId: string;
    accessLevel: 'VIEW' | 'MANAGE' | 'FULL' | 'CUSTOM';
  }> {
    const merged = new Map<string, ModuleAccessLevel>();
    for (const keys of permissionKeySets) {
      for (const row of deriveModuleAccessFromKeysDetailed(keys)) {
        if (row.accessLevel === 'NONE') {
          continue;
        }
        const prev = merged.get(row.moduleId) ?? 'NONE';
        merged.set(row.moduleId, maxModuleAccessLevel(prev, row.accessLevel));
      }
    }
    return [...merged.entries()]
      .filter(([, level]) => level !== 'NONE')
      .map(([moduleId, accessLevel]) => ({
        moduleId,
        accessLevel: accessLevel as 'VIEW' | 'MANAGE' | 'FULL' | 'CUSTOM',
      }))
      .sort((a, b) => a.moduleId.localeCompare(b.moduleId));
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    accessTtlSec: number,
    refreshTtlSec: number,
    req: Request,
  ): Promise<TokenPairResponseDto> {
    const payload: JwtAccessPayload = { sub: userId, email };
    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + refreshTtlSec * 1000);
    await this.authRepository.insertRefreshToken({
      userId,
      tokenHash: hashOpaqueToken(refreshToken),
      expiresAt,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessTtlSec,
    };
  }
}
