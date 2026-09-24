import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Get('status')
  @ApiOperation({ summary: 'Auth module scaffold status (JWT flow planned)' })
  status(): { module: string; implemented: boolean; note: string } {
    return {
      module: 'auth',
      implemented: false,
      note: 'Login, refresh, and JWT guards are planned; see docs/architecture/auth-rbac-plan.md',
    };
  }
}
