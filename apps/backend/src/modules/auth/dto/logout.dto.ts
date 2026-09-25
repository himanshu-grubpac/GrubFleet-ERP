import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({
    description:
      'When provided, revokes only this refresh session; otherwise revokes all active refresh tokens for the user.',
  })
  @IsOptional()
  @IsString()
  @MinLength(16)
  refreshToken?: string;
}
