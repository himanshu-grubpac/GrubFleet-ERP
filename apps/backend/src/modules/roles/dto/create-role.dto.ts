import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ModuleAccessEntryDto } from './module-access-entry.dto';

export class CreateRoleDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    type: [ModuleAccessEntryDto],
    description: 'Preferred Mohit Phase 1 contract; expands to permissionKeys',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleAccessEntryDto)
  moduleAccess?: ModuleAccessEntryDto[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Legacy/alternate; ignored when moduleAccess is provided',
  })
  @ValidateIf((o: CreateRoleDto) => !o.moduleAccess?.length)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissionKeys?: string[];
}
