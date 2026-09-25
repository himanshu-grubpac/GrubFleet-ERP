import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
  type PaginatedResult,
} from '../../common/dto/pagination-query.dto';
import {
  ERP_MODULES,
  isKnownErpModuleId,
} from '../auth/authorization/constants/erp-module-registry';
import {
  allowedLevelsForActor,
  deriveModuleAccessFromKeys,
  deriveModuleAccessFromKeysDetailed,
  expandModuleAccess,
  resolveModuleAccessLevel,
  type ModuleAccessEntry,
  type ModuleAccessLevel,
} from '../auth/authorization/module-access.util';
import { AuditService } from '../audit/audit.service';
import { AuthorizationRepository } from '../auth/authorization/authorization.repository';
import { AuthorizationService } from '../auth/authorization/authorization.service';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { ModuleAccessEntryDto } from './dto/module-access-entry.dto';
import type { RoleAssignmentDto } from './dto/role-assignment.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import { RolesRepository } from './roles.repository';

export type RoleDto = {
  id: string;
  organizationId: string | null;
  name: string;
  scope: 'system' | 'organization';
  description: string | null;
  isSystem: boolean;
  permissionKeys: string[];
  moduleAccess: ModuleAccessEntry[];
  createdAt: string;
  updatedAt: string;
};

export type RoleEditorMatrixRow = {
  moduleId: string;
  label: string;
  sortOrder: number;
  allowedLevels: Array<'NONE' | 'VIEW' | 'MANAGE' | 'FULL'>;
  actorMaxLevel: ModuleAccessLevel;
  roleLevel: ModuleAccessLevel;
};

export type RoleEditorMatrixDto = {
  organizationId: string;
  roleId: string | null;
  modules: RoleEditorMatrixRow[];
};

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly authorizationRepository: AuthorizationRepository,
    private readonly auditService: AuditService,
  ) {}

  async listRoles(
    organizationId: string,
    page = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedResult<RoleDto>> {
    const { rows, total } = await this.rolesRepository.listOrgRoles(
      organizationId,
      page,
      pageSize,
    );
    const items = await Promise.all(
      rows.map(async (role) => {
        const permissionKeys =
          await this.rolesRepository.getPermissionKeysForRole(role.id);
        return this.toDto(role, permissionKeys);
      }),
    );
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getEditorMatrix(
    actorUserId: string,
    organizationId: string,
    roleId?: string,
  ): Promise<RoleEditorMatrixDto> {
    const actorKeys =
      await this.authorizationService.getEffectivePermissionKeys(
        actorUserId,
        organizationId,
      );

    let roleKeys: string[] = [];
    if (roleId) {
      const role = await this.rolesRepository.findOrgRoleById(
        roleId,
        organizationId,
      );
      if (!role) {
        throw new NotFoundException({
          message: 'Role not found',
          code: 'ROLE_NOT_FOUND',
        });
      }
      roleKeys = await this.rolesRepository.getPermissionKeysForRole(roleId);
    }

    const roleLevels = deriveModuleAccessFromKeysDetailed(roleKeys);

    const modules: RoleEditorMatrixRow[] = ERP_MODULES.map((mod) => {
      const actorMaxLevel = resolveModuleAccessLevel(actorKeys, mod.id);
      const roleRow = roleLevels.find((r) => r.moduleId === mod.id);
      const roleLevel = roleRow?.accessLevel ?? 'NONE';
      if (roleLevel === 'CUSTOM') {
        const allowedLevels = allowedLevelsForActor(
          actorMaxLevel,
          mod.supportsManage,
        );
        const actorMaxForUi =
          actorMaxLevel === 'CUSTOM'
            ? ('FULL' as ModuleAccessLevel)
            : actorMaxLevel;
        return {
          moduleId: mod.id,
          label: mod.label,
          sortOrder: mod.sortOrder,
          allowedLevels,
          actorMaxLevel: actorMaxForUi,
          roleLevel: 'CUSTOM',
        };
      }
      const allowedLevels = allowedLevelsForActor(
        actorMaxLevel,
        mod.supportsManage,
      );
      const actorMaxForUi =
        actorMaxLevel === 'CUSTOM'
          ? ('FULL' as ModuleAccessLevel)
          : actorMaxLevel;
      return {
        moduleId: mod.id,
        label: mod.label,
        sortOrder: mod.sortOrder,
        allowedLevels,
        actorMaxLevel: actorMaxForUi,
        roleLevel,
      };
    });

    return {
      organizationId,
      roleId: roleId ?? null,
      modules,
    };
  }

  async createRole(actorUserId: string, dto: CreateRoleDto): Promise<RoleDto> {
    const permissionKeys = this.resolvePermissionKeysFromDto(dto);

    if (dto.moduleAccess?.length) {
      await this.authorizationService.assertCanDelegateModuleAccess(
        actorUserId,
        dto.organizationId,
        dto.moduleAccess,
      );
    }

    await this.authorizationService.assertCanDelegatePermissions(
      actorUserId,
      dto.organizationId,
      permissionKeys,
    );
    await this.validatePermissionKeysExist(permissionKeys);

    let role;
    try {
      role = await this.rolesRepository.insertRole({
        organizationId: dto.organizationId,
        name: dto.name.trim(),
        description: dto.description ?? null,
      });
    } catch {
      throw new ConflictException({
        message: 'Role name already exists in this organization',
        code: 'ROLE_NAME_CONFLICT',
      });
    }

    const permissionIds =
      await this.rolesRepository.findPermissionIdsByKeys(permissionKeys);
    if (permissionIds.length !== permissionKeys.length) {
      throw new BadRequestException({
        message: 'One or more permission keys are invalid',
        code: 'INVALID_PERMISSION_KEYS',
      });
    }

    await this.rolesRepository.replaceRolePermissions(role.id, permissionIds);
    await this.authorizationService.invalidateOrganizationPermissions(
      dto.organizationId,
    );

    await this.auditService.log({
      userId: actorUserId,
      organizationId: dto.organizationId,
      action: 'roles.create',
      resourceType: 'role',
      resourceId: role.id,
      metadata: {
        name: dto.name,
        permissionKeys,
        moduleAccess: dto.moduleAccess,
      },
    });

    const savedKeys = await this.rolesRepository.getPermissionKeysForRole(
      role.id,
    );
    return this.toDto(role, savedKeys);
  }

  async updateRole(
    actorUserId: string,
    roleId: string,
    organizationId: string,
    dto: UpdateRoleDto,
  ): Promise<RoleDto> {
    const role = await this.rolesRepository.findOrgRoleById(
      roleId,
      organizationId,
    );
    if (!role) {
      throw new NotFoundException({
        message: 'Role not found',
        code: 'ROLE_NOT_FOUND',
      });
    }
    if (role.isSystem) {
      throw new ConflictException({
        message: 'System roles cannot be modified',
        code: 'ROLE_IS_SYSTEM',
      });
    }

    const resolvedKeys = this.resolvePermissionKeysFromUpdateDto(dto);
    if (resolvedKeys) {
      if (dto.moduleAccess?.length) {
        await this.authorizationService.assertCanDelegateModuleAccess(
          actorUserId,
          organizationId,
          dto.moduleAccess,
        );
      }
      await this.authorizationService.assertCanDelegatePermissions(
        actorUserId,
        organizationId,
        resolvedKeys,
      );
      await this.validatePermissionKeysExist(resolvedKeys);
      const permissionIds =
        await this.rolesRepository.findPermissionIdsByKeys(resolvedKeys);
      if (permissionIds.length !== resolvedKeys.length) {
        throw new BadRequestException({
          message: 'One or more permission keys are invalid',
          code: 'INVALID_PERMISSION_KEYS',
        });
      }
      await this.rolesRepository.replaceRolePermissions(roleId, permissionIds);
    }

    if (dto.name !== undefined || dto.description !== undefined) {
      await this.rolesRepository.updateRoleFields(roleId, {
        name: dto.name?.trim(),
        description: dto.description,
      });
    }

    const affectedUserIds =
      await this.rolesRepository.listUserIdsWithRoleInOrganization(
        roleId,
        organizationId,
      );
    await this.authorizationService.invalidateOrganizationPermissions(
      organizationId,
      affectedUserIds,
    );

    await this.auditService.log({
      userId: actorUserId,
      organizationId,
      action: 'roles.update',
      resourceType: 'role',
      resourceId: roleId,
      metadata: { ...dto },
    });

    const updated = await this.rolesRepository.findOrgRoleById(
      roleId,
      organizationId,
    );
    if (!updated) {
      throw new NotFoundException({
        message: 'Role not found',
        code: 'ROLE_NOT_FOUND',
      });
    }
    const permissionKeys =
      await this.rolesRepository.getPermissionKeysForRole(roleId);
    return this.toDto(updated, permissionKeys);
  }

  async assignRole(
    actorUserId: string,
    roleId: string,
    dto: RoleAssignmentDto,
  ): Promise<{ success: true }> {
    const role = await this.rolesRepository.findOrgRoleById(
      roleId,
      dto.organizationId,
    );
    if (!role) {
      throw new NotFoundException({
        message: 'Role not found',
        code: 'ROLE_NOT_FOUND',
      });
    }

    const rolePermissionKeys =
      await this.rolesRepository.getPermissionKeysForRole(roleId);
    await this.authorizationService.assertCanDelegatePermissions(
      actorUserId,
      dto.organizationId,
      rolePermissionKeys,
    );

    const member = await this.authorizationRepository.hasActiveMembership(
      dto.userId,
      dto.organizationId,
    );
    if (!member) {
      throw new BadRequestException({
        message: 'User is not an active member of this organization',
        code: 'USER_NOT_IN_ORG',
      });
    }

    await this.rolesRepository.assignRoleToUser({
      userId: dto.userId,
      roleId,
      organizationId: dto.organizationId,
    });
    await this.authorizationService.invalidateOrganizationPermissions(
      dto.organizationId,
      [dto.userId],
    );

    await this.auditService.log({
      userId: actorUserId,
      organizationId: dto.organizationId,
      action: 'roles.assign',
      resourceType: 'role',
      resourceId: roleId,
      metadata: { userId: dto.userId },
    });

    return { success: true };
  }

  async unassignRole(
    actorUserId: string,
    roleId: string,
    dto: RoleAssignmentDto,
  ): Promise<{ success: true }> {
    const role = await this.rolesRepository.findOrgRoleById(
      roleId,
      dto.organizationId,
    );
    if (!role) {
      throw new NotFoundException({
        message: 'Role not found',
        code: 'ROLE_NOT_FOUND',
      });
    }

    const rolePermissionKeys =
      await this.rolesRepository.getPermissionKeysForRole(roleId);
    await this.authorizationService.assertCanDelegatePermissions(
      actorUserId,
      dto.organizationId,
      rolePermissionKeys,
    );

    const removed = await this.rolesRepository.removeRoleAssignment({
      userId: dto.userId,
      roleId,
      organizationId: dto.organizationId,
    });
    if (!removed) {
      throw new NotFoundException({
        message: 'Role assignment not found',
        code: 'ROLE_ASSIGNMENT_NOT_FOUND',
      });
    }

    await this.authorizationService.invalidateOrganizationPermissions(
      dto.organizationId,
      [dto.userId],
    );

    await this.auditService.log({
      userId: actorUserId,
      organizationId: dto.organizationId,
      action: 'roles.unassign',
      resourceType: 'role',
      resourceId: roleId,
      metadata: { userId: dto.userId },
    });

    return { success: true };
  }

  private resolvePermissionKeysFromDto(dto: CreateRoleDto): string[] {
    if (dto.moduleAccess !== undefined) {
      this.validateModuleAccessEntries(dto.moduleAccess, true);
      const keys = expandModuleAccess(dto.moduleAccess);
      if (keys.length === 0) {
        throw new BadRequestException({
          message: 'At least one module must have VIEW, MANAGE, or FULL access',
          code: 'MODULE_ACCESS_EMPTY',
        });
      }
      return keys;
    }
    if (!dto.permissionKeys?.length) {
      throw new BadRequestException({
        message: 'moduleAccess or permissionKeys is required',
        code: 'ROLE_PERMISSIONS_REQUIRED',
      });
    }
    return [...new Set(dto.permissionKeys)].sort();
  }

  private resolvePermissionKeysFromUpdateDto(
    dto: UpdateRoleDto,
  ): string[] | undefined {
    if (dto.moduleAccess !== undefined) {
      this.validateModuleAccessEntries(dto.moduleAccess, false);
      return expandModuleAccess(dto.moduleAccess);
    }
    if (dto.permissionKeys !== undefined) {
      return [...new Set(dto.permissionKeys)].sort();
    }
    return undefined;
  }

  private validateModuleAccessEntries(
    entries: ModuleAccessEntryDto[],
    requireGrant: boolean,
  ): void {
    for (const entry of entries) {
      if (!isKnownErpModuleId(entry.moduleId)) {
        throw new BadRequestException({
          message: `Unknown module id: ${entry.moduleId}`,
          code: 'INVALID_MODULE_ID',
        });
      }
    }
    const hasGrant = entries.some(
      (e) =>
        e.accessLevel === 'VIEW' ||
        e.accessLevel === 'MANAGE' ||
        e.accessLevel === 'FULL',
    );
    if (requireGrant && !hasGrant) {
      throw new BadRequestException({
        message: 'At least one module must have VIEW, MANAGE, or FULL access',
        code: 'MODULE_ACCESS_EMPTY',
      });
    }
    for (const entry of entries) {
      const mod = ERP_MODULES.find((m) => m.id === entry.moduleId);
      if (
        mod &&
        !mod.supportsManage &&
        (entry.accessLevel === 'MANAGE' || entry.accessLevel === 'FULL')
      ) {
        throw new BadRequestException({
          message: `Module ${entry.moduleId} does not support MANAGE or FULL`,
          code: 'INVALID_MODULE_ACCESS_LEVEL',
        });
      }
    }
  }

  private async validatePermissionKeysExist(keys: string[]): Promise<void> {
    const map =
      await this.authorizationRepository.findPermissionIdsByKeys(keys);
    if (map.size !== keys.length) {
      throw new BadRequestException({
        message: 'One or more permission keys are invalid',
        code: 'INVALID_PERMISSION_KEYS',
      });
    }
  }

  private toDto(
    role: {
      id: string;
      organizationId: string | null;
      name: string;
      scope: 'system' | 'organization';
      description: string | null;
      isSystem: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    permissionKeys: string[],
  ): RoleDto {
    return {
      id: role.id,
      organizationId: role.organizationId,
      name: role.name,
      scope: role.scope,
      description: role.description,
      isSystem: role.isSystem,
      permissionKeys: [...permissionKeys].sort(),
      moduleAccess: deriveModuleAccessFromKeys(permissionKeys),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }
}
