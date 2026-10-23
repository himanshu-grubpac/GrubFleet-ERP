import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  WORKSHOP_MAINTENANCE_SCHEDULE_ASSET_CLASS_LABEL_MAX,
  WORKSHOP_MAINTENANCE_SCHEDULE_DESCRIPTION_MAX,
  WORKSHOP_MAINTENANCE_SCHEDULE_INTERVAL_LABEL_MAX,
  WORKSHOP_MAINTENANCE_SCHEDULE_INTERVAL_TYPE_MAX,
  WORKSHOP_MAINTENANCE_SCHEDULE_MAINTENANCE_TYPE_MAX,
  WORKSHOP_MAINTENANCE_SCHEDULE_NAME_MAX,
  WORKSHOP_MAINTENANCE_SCHEDULE_VEHICLE_APPLICABILITY_MAX,
} from '../constants/workshop-field.constants';

export class CreateMaintenanceScheduleDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_NAME_MAX)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_ASSET_CLASS_LABEL_MAX)
  assetClassLabel?: string;

  @ApiPropertyOptional({
    description: 'Human-readable interval, e.g. "4000 km" or "90 days"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_INTERVAL_LABEL_MAX)
  intervalLabel?: string;

  @ApiPropertyOptional({ example: 'Preventive Maintenance' })
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_MAINTENANCE_TYPE_MAX)
  maintenanceType?: string;

  @ApiPropertyOptional({ example: 'Odometer' })
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_INTERVAL_TYPE_MAX)
  intervalType?: string;

  @ApiPropertyOptional({ example: 'Leased' })
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_VEHICLE_APPLICABILITY_MAX)
  vehicleApplicability?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_DESCRIPTION_MAX)
  description?: string;
}
