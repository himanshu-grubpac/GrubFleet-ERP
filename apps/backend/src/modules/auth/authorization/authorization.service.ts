import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthorizationRepository } from './authorization.repository';
import {
  assertModuleAccessDelegatable,
  expandModuleAccess,
} from './module-access.util';
import { PermissionCacheService } from './permission-cache.service';

export const ORGANIZATION_ID_HEADER = 'x-organization-id';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly authorizationRepository: AuthorizationRepository,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  resolveOrganizationId(req: Request, required: boolean): string | undefined {
    const headerVal = req.headers[ORGANIZATION_ID_HEADER];
    const fromHeader =
      typeof headerVal === 'string' && headerVal.trim().length > 0
        ? headerVal.trim()
        : undefined;
    const queryVal = req.query.organizationId;
    const fromQuery =
      typeof queryVal === 'string' && queryVal.trim().length > 0
        ? queryVal.trim()
        : undefined;

    const body = req.body as { organizationId?: unknown } | undefined;
    const fromBody =
      typeof body?.organizationId === 'string' &&
      body.organizationId.trim().length > 0
        ? body.organizationId.trim()
        : undefined;

    const organizationId = fromHeader ?? fromQuery ?? fromBody;
    if (!organizationId) {
      if (required) {
        throw new ForbiddenException({
          message: 'Organization context is required',
          code: 'ORGANIZATION_CONTEXT_REQUIRED',
        });
      }
      return undefined;
    }
    return organizationId;
  }

  async assertOrganizationAccess(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const systemRole =
      await this.authorizationRepository.userHasSystemScopeRole(userId);
    if (systemRole) {
      return;
    }
    const member = await this.authorizationRepository.hasActiveMembership(
      userId,
      organizationId,
    );
    if (!member) {
      throw new ForbiddenException({
        message: 'You are not a member of this organization',
        code: 'ORGANIZATION_ACCESS_DENIED',
      });
    }
  }

  async getEffectivePermissionKeys(
    userId: string,
    organizationId: string,
  ): Promise<string[]> {
    const revision = await this.permissionCache.getOrgRevision(organizationId);
    const cached = await this.permissionCache.getCachedPermissionKeys(
      userId,
      organizationId,
      revision,
    );
    if (cached) {
      return cached;
    }

    const keys = await this.authorizationRepository.loadEffectivePermissionKeys(
      userId,
      organizationId,
    );
    await this.permissionCache.setCachedPermissionKeys(
      userId,
      organizationId,
      revision,
      keys,
    );
    return keys;
  }

  async assertPermissions(
    userId: string,
    organizationId: string,
    requiredKeys: string[],
  ): Promise<void> {
    if (requiredKeys.length === 0) {
      return;
    }
    const held = await this.getEffectivePermissionKeys(userId, organizationId);
    const heldSet = new Set(held);
    const missing = requiredKeys.filter((k) => !heldSet.has(k));
    if (missing.length > 0) {
      throw new ForbiddenException({
        message: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        details: { missing },
      });
    }
  }

  async canBypassDelegation(userId: string): Promise<boolean> {
    return this.authorizationRepository.userHasSystemScopeRole(userId);
  }

  /**
   * Caller may only grant permission keys they already hold in the org
   * (system-scoped roles bypass).
   */
  async assertCanDelegateModuleAccess(
    userId: string,
    organizationId: string,
    moduleAccess: Array<{
      moduleId: string;
      accessLevel: 'NONE' | 'VIEW' | 'FULL';
    }>,
  ): Promise<void> {
    const grantable = moduleAccess.filter((e) => e.accessLevel !== 'NONE');
    if (grantable.length === 0) {
      return;
    }
    if (await this.canBypassDelegation(userId)) {
      return;
    }
    const held = await this.getEffectivePermissionKeys(userId, organizationId);
    const check = assertModuleAccessDelegatable(held, grantable);
    if (!check.ok) {
      throw new ForbiddenException({
        message: 'Cannot grant module access above your own level',
        code: 'DELEGATION_DENIED',
        details: { violations: check.violations },
      });
    }
    const expanded = expandModuleAccess(grantable);
    await this.assertCanDelegatePermissions(userId, organizationId, expanded);
  }

  async assertCanDelegatePermissions(
    userId: string,
    organizationId: string,
    permissionKeysToGrant: string[],
  ): Promise<void> {
    if (permissionKeysToGrant.length === 0) {
      return;
    }
    if (await this.canBypassDelegation(userId)) {
      return;
    }
    const held = await this.getEffectivePermissionKeys(userId, organizationId);
    const heldSet = new Set(held);
    const notHeld = permissionKeysToGrant.filter((k) => !heldSet.has(k));
    if (notHeld.length > 0) {
      throw new ForbiddenException({
        message: 'Cannot grant permissions you do not hold',
        code: 'DELEGATION_DENIED',
        details: { notHeld },
      });
    }
  }

  async invalidateOrganizationPermissions(
    organizationId: string,
  ): Promise<void> {
    await this.permissionCache.bumpOrgRevision(organizationId);
  }

  assertOrganizationResourceExists(
    organizationId: string,
    exists: boolean,
  ): void {
    if (!exists) {
      throw new NotFoundException({
        message: 'Organization not found',
        code: 'ORGANIZATION_NOT_FOUND',
      });
    }
  }
}
