import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import {
  OrganisationPermissionKeys,
  OrganisationWriteAny,
} from './constants/organisation-permission-keys';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto';
import { EmployeesService } from './employees.service';

@ApiTags('organisation')
@ApiBearerAuth()
@Controller('organisation/employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(OrganisationPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List organisation employees (paginated)',
    description:
      'Default sort: createdAt descending (newest first), then id descending. No client sort parameters.',
  })
  list(@Query() query: ListEmployeesQueryDto) {
    return this.employees.list(query);
  }

  @Get('departments')
  @RequireOrganizationContext()
  @RequirePermissions(OrganisationPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Distinct department names used by employees in the organisation',
  })
  listDepartments(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.employees.listDepartments(organizationId);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(OrganisationPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Employee detail' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employees.getById(organizationId, id);
  }

  @Post()
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.CREATE)
  @ApiOperation({ summary: 'Create organisation employee' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employees.create(dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update organisation employee' })
  update(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employees.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Activate or deactivate employee (reason type required for deactivate)',
  })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeStatusDto,
  ) {
    return this.employees.updateStatus(user.userId, organizationId, id, dto);
  }
}
