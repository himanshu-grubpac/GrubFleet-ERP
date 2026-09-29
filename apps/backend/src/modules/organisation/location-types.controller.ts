import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import {
  OrganisationPermissionKeys,
  OrganisationWriteAny,
} from './constants/organisation-permission-keys';
import { CreateLocationTypeDto } from './dto/create-location-type.dto';
import { OrganisationOrgQueryDto } from './dto/list-locations-query.dto';
import { LocationTypesService } from './location-types.service';

@ApiTags('organisation')
@ApiBearerAuth()
@Controller('organisation/location-types')
export class LocationTypesController {
  constructor(private readonly locationTypes: LocationTypesService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(OrganisationPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List org location types (system presets + custom)',
  })
  list(@Query() query: OrganisationOrgQueryDto) {
    return this.locationTypes.list(query.organizationId);
  }

  @Post()
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.CREATE)
  @ApiOperation({ summary: 'Add custom location type' })
  create(@Body() dto: CreateLocationTypeDto) {
    return this.locationTypes.create(dto);
  }

  @Delete(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.DELETE)
  @ApiOperation({ summary: 'Delete custom location type when unused' })
  delete(
    @Query() query: OrganisationOrgQueryDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.locationTypes.deleteCustom(query.organizationId, id);
  }
}
