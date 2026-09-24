import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  @Get('status')
  @ApiOperation({ summary: 'Audit logging module scaffold status' })
  status(): { module: string; implemented: boolean } {
    return { module: 'audit', implemented: false };
  }
}
