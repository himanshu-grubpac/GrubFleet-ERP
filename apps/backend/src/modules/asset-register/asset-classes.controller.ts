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
import { AssetClassesService } from './asset-classes.service';
import { AssetMastersService } from './asset-masters.service';
import { ListAssetMastersQueryDto } from './dto/list-asset-masters-query.dto';
import {
  AssetRegisterPermissionKeys,
  AssetRegisterWriteAny,
} from './constants/asset-register-permission-keys';
import { CreateAssetClassDto } from './dto/create-asset-class.dto';
import { ListAssetClassesQueryDto } from './dto/list-asset-classes-query.dto';
import { UpdateAssetClassDto } from './dto/update-asset-class.dto';
import { UpdateAssetClassStatusDto } from './dto/update-asset-class-status.dto';

@ApiTags('asset-register')
@ApiBearerAuth()
@Controller('asset-register/asset-classes')
export class AssetClassesController {
  constructor(
    private readonly assetClasses: AssetClassesService,
    private readonly assetMasters: AssetMastersService,
  ) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List asset classes (paginated)',
    description:
      'Default sort: createdAt descending (newest first), then id descending. Search matches class name or code.',
  })
  list(@Query() query: ListAssetClassesQueryDto) {
    return this.assetClasses.list(query);
  }

  @Get(':classId/masters')
  @RequireOrganizationContext()
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Catalog: active asset masters for an active asset class',
    description:
      'Fleet register dropdown source. Returns only active masters; asset class must be active. Same pagination as asset masters list.',
  })
  listMastersForClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: ListAssetMastersQueryDto,
  ) {
    return this.assetMasters.listCatalogForClass(
      query.organizationId,
      classId,
      query,
    );
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Asset class detail' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetClasses.getById(organizationId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AssetRegisterWriteAny.CREATE)
  @ApiOperation({
    summary: 'Create asset class (class code generated server-side)',
  })
  create(@Body() dto: CreateAssetClassDto) {
    return this.assetClasses.create(dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AssetRegisterWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update asset class (not when inactive)' })
  update(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetClassDto,
  ) {
    return this.assetClasses.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AssetRegisterWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Activate or deactivate asset class (reason required for deactivate)',
  })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetClassStatusDto,
  ) {
    return this.assetClasses.updateStatus(user.userId, organizationId, id, dto);
  }
}
