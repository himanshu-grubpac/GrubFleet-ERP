import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH } from '../constants/auth.constants';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Opaque token from reset email or dev test hook',
  })
  @IsString()
  @MinLength(16)
  token!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  newPassword!: string;
}
