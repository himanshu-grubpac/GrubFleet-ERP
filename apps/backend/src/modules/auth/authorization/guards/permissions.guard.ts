import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../../../common/decorators/public.decorator';
import { AuthorizationService } from '../authorization.service';
import { REQUIRE_ORGANIZATION_CONTEXT_KEY } from '../decorators/require-organization-context.decorator';
import { REQUIRED_ANY_PERMISSIONS_KEY } from '../decorators/require-any-permissions.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const requiredAnyPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_ANY_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const requireOrgContext = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_ORGANIZATION_CONTEXT_KEY,
      [context.getHandler(), context.getClass()],
    );

    const needsOrgContext =
      requireOrgContext === true ||
      requiredPermissions.length > 0 ||
      requiredAnyPermissions.length > 0;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user?.userId) {
      throw new UnauthorizedException({
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    const organizationId = this.authorizationService.resolveOrganizationId(
      request,
      needsOrgContext,
    );

    if (organizationId) {
      await this.authorizationService.assertOrganizationAccess(
        user.userId,
        organizationId,
      );
      request.organizationId = organizationId;
    } else if (needsOrgContext) {
      throw new ForbiddenException({
        message: 'Organization context is required',
        code: 'ORGANIZATION_CONTEXT_REQUIRED',
      });
    }

    if (requiredPermissions.length > 0 || requiredAnyPermissions.length > 0) {
      if (!organizationId) {
        throw new ForbiddenException({
          message: 'Organization context is required for permission checks',
          code: 'ORGANIZATION_CONTEXT_REQUIRED',
        });
      }
      if (requiredPermissions.length > 0) {
        await this.authorizationService.assertPermissions(
          user.userId,
          organizationId,
          requiredPermissions,
        );
      }
      if (requiredAnyPermissions.length > 0) {
        await this.authorizationService.assertAnyPermission(
          user.userId,
          organizationId,
          requiredAnyPermissions,
        );
      }
    }

    return true;
  }
}
