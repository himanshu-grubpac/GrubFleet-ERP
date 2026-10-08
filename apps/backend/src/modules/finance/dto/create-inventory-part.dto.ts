import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateInventoryPartDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ maxLength: 255 })
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @MaxLength(64)
  partCode?: string;
}
