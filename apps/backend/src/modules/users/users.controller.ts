import {
  Body,
  Controller,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import {
  AdministrationWriteAny,
  PermissionKeys,
} from '../auth/authorization/constants/permission-keys';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(PermissionKeys.ADMINISTRATION_VIEW)
  @ApiOperation({ summary: 'List members in an organization' })
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsersInOrg(
      query.organizationId,
      query.page,
      query.pageSize,
    );
  }

  @Post()
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AdministrationWriteAny.CREATE)
  @ApiOperation({ summary: 'Create user and active membership' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.usersService.createUser(user.userId, dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AdministrationWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update user profile fields in org scope' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const organizationId = req.organizationId;
    if (!organizationId) {
      throw new Error('organizationId missing after guard');
    }
    return this.usersService.updateUserInOrg(
      user.userId,
      organizationId,
      id,
      dto,
    );
  }
}
