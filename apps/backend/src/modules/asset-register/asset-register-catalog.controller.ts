import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { ASSET_CLASS_INTAKE_CATALOG_ITEMS } from './constants/asset-class.constants';
import { AssetRegisterPermissionKeys } from './constants/asset-register-permission-keys';

@ApiTags('asset-register')
@ApiBearerAuth()
@Controller('asset-register/catalog')
export class AssetRegisterCatalogController {
  @Get('intake-checklist-items')
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({
    summary:
      'Global intake checklist catalog (seed items for asset class create)',
  })
  listIntakeChecklistItems() {
    return { items: [...ASSET_CLASS_INTAKE_CATALOG_ITEMS] };
  }
}
