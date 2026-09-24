import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  @Get('status')
  @ApiOperation({ summary: 'Roles module scaffold status' })
  status(): { module: string; implemented: boolean } {
    return { module: 'roles', implemented: false };
  }
}
