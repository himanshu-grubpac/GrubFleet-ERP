import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMaintenanceScheduleDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  assetClassLabel?: string;

  @ApiPropertyOptional({
    description: 'Human-readable interval, e.g. "4000 km" or "90 days"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  intervalLabel?: string;

  @ApiPropertyOptional({ example: 'Preventive Maintenance' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  maintenanceType?: string;

  @ApiPropertyOptional({ example: 'Odometer' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  intervalType?: string;

  @ApiPropertyOptional({ example: 'Leased' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  vehicleApplicability?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
