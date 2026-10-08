import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { AssetRegisterComplianceService } from './asset-register-compliance.service';
import {
  AssetRegisterPermissionKeys,
  AssetRegisterWriteAny,
} from './constants/asset-register-permission-keys';
import { ListAssetRegisterComplianceQueryDto } from './dto/list-asset-register-compliance-query.dto';
import { RenewAssetRegisterComplianceDto } from './dto/renew-asset-register-compliance.dto';

@ApiTags('asset-register')
@ApiBearerAuth()
@Controller('asset-register/compliance')
export class AssetRegisterComplianceController {
  constructor(private readonly compliance: AssetRegisterComplianceService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Compliance list (insurance, registration, warranty)',
    description:
      'Statuses derived from vehicle date fields. Filter by overall compliance bucket (expired, expiring_soon within 30 days, valid). Active vehicles only.',
  })
  list(@Query() query: ListAssetRegisterComplianceQueryDto) {
    return this.compliance.list(query);
  }

  @Get(':vehicleId')
  @RequireOrganizationContext()
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Compliance detail for a vehicle (fleetCode hover / summary)',
  })
  getDetail(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    return this.compliance.getDetail(organizationId, vehicleId);
  }

  @Post(':vehicleId/renew')
  @HttpCode(HttpStatus.OK)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AssetRegisterWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Renew insurance, registration, or warranty dates on a vehicle',
  })
  renew(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: RenewAssetRegisterComplianceDto,
  ) {
    return this.compliance.renew(user.userId, vehicleId, dto);
  }
}
