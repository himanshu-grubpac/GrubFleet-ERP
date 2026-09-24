import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  @Get('status')
  @ApiOperation({ summary: 'Users module scaffold status' })
  status(): { module: string; implemented: boolean } {
    return { module: 'users', implemented: false };
  }
}
