import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsValidPhone } from '../../../common/decorators/is-valid-phone.decorator';

export class ClientPocDto {
  @ApiPropertyOptional({ description: 'Set when updating an existing POC row' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(32)
  @IsValidPhone()
  contactNumber!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  isPrimary!: boolean;
}
