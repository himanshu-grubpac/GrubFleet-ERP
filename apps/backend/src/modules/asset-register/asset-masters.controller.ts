import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { AssetMastersService } from './asset-masters.service';
import {
  AssetRegisterPermissionKeys,
  AssetRegisterWriteAny,
} from './constants/asset-register-permission-keys';
import { CreateAssetMasterDto } from './dto/create-asset-master.dto';
import { ListAssetMastersQueryDto } from './dto/list-asset-masters-query.dto';
import { UpdateAssetMasterDto } from './dto/update-asset-master.dto';
import { UpdateAssetMasterStatusDto } from './dto/update-asset-master-status.dto';

@ApiTags('asset-register')
@ApiBearerAuth()
@Controller('asset-register/asset-masters')
export class AssetMastersController {
  constructor(private readonly assetMasters: AssetMastersService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List asset masters (paginated)',
    description:
      'Default sort: createdAt descending. Optional assetClassId filter and name search. Class spec fields are joined from asset class on detail; list returns class name/code only.',
  })
  list(@Query() query: ListAssetMastersQueryDto) {
    return this.assetMasters.list(query);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Asset master detail',
    description:
      'Includes read-only class specification snapshot (vehicle type, fuel, mileage, tank, load).',
  })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetMasters.getById(organizationId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AssetRegisterWriteAny.CREATE)
  @ApiOperation({
    summary: 'Create asset master (class must be active in org)',
  })
  create(@Body() dto: CreateAssetMasterDto) {
    return this.assetMasters.create(dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AssetRegisterWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Update asset master name and/or asset class',
    description:
      'Blocked when master or linked class is inactive. New class must be active in org.',
  })
  update(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetMasterDto,
  ) {
    return this.assetMasters.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AssetRegisterWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Activate or deactivate asset master (reason required for deactivate)',
  })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetMasterStatusDto,
  ) {
    return this.assetMasters.updateStatus(user.userId, organizationId, id, dto);
  }
}
