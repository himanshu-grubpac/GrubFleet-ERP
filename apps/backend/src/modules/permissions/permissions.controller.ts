import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController {
  @Get('status')
  @ApiOperation({ summary: 'Permissions catalog scaffold status' })
  status(): { module: string; implemented: boolean } {
    return { module: 'permissions', implemented: false };
  }
}
