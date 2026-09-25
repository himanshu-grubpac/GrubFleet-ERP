import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import {
  AdministrationWriteAny,
  PermissionKeys,
} from '../auth/authorization/constants/permission-keys';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateRoleDto } from './dto/create-role.dto';
import { ListRolesQueryDto } from './dto/list-roles-query.dto';
import { RoleAssignmentDto } from './dto/role-assignment.dto';
import { RoleEditorMatrixQueryDto } from './dto/role-editor-matrix-query.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('editor-matrix')
  @RequireOrganizationContext()
  @RequirePermissions(PermissionKeys.ADMINISTRATION_VIEW)
  @ApiOperation({
    summary:
      'Module rows for role editor (NONE/VIEW/MANAGE/FULL per sidebar module)',
  })
  editorMatrix(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RoleEditorMatrixQueryDto,
  ) {
    return this.rolesService.getEditorMatrix(
      user.userId,
      query.organizationId,
      query.roleId,
    );
  }

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(PermissionKeys.ADMINISTRATION_VIEW)
  @ApiOperation({ summary: 'List organization roles' })
  list(@Query() query: ListRolesQueryDto) {
    return this.rolesService.listRoles(
      query.organizationId,
      query.page,
      query.pageSize,
    );
  }

  @Post()
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AdministrationWriteAny.CREATE)
  @ApiOperation({ summary: 'Create organization role' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(user.userId, dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AdministrationWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update organization role' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new Error('organizationId missing after guard');
    }
    return this.rolesService.updateRole(user.userId, id, organizationId, dto);
  }

  @Post(':id/assign')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AdministrationWriteAny.UPDATE)
  @ApiOperation({ summary: 'Assign role to user in organization' })
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RoleAssignmentDto,
  ) {
    return this.rolesService.assignRole(user.userId, id, dto);
  }

  @Delete(':id/assign')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AdministrationWriteAny.UPDATE)
  @ApiOperation({ summary: 'Remove role assignment' })
  unassign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RoleAssignmentDto,
  ) {
    return this.rolesService.unassignRole(user.userId, id, dto);
  }
}
