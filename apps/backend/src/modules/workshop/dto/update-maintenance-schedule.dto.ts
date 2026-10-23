import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  WORKSHOP_MAINTENANCE_SCHEDULE_ASSET_CLASS_LABEL_MAX,
  WORKSHOP_MAINTENANCE_SCHEDULE_DESCRIPTION_MAX,
  WORKSHOP_MAINTENANCE_SCHEDULE_INTERVAL_LABEL_MAX,
  WORKSHOP_MAINTENANCE_SCHEDULE_INTERVAL_TYPE_MAX,
  WORKSHOP_MAINTENANCE_SCHEDULE_MAINTENANCE_TYPE_MAX,
  WORKSHOP_MAINTENANCE_SCHEDULE_NAME_MAX,
  WORKSHOP_MAINTENANCE_SCHEDULE_VEHICLE_APPLICABILITY_MAX,
} from '../constants/workshop-field.constants';

export class UpdateMaintenanceScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_NAME_MAX)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_ASSET_CLASS_LABEL_MAX)
  assetClassLabel?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_INTERVAL_LABEL_MAX)
  intervalLabel?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_MAINTENANCE_TYPE_MAX)
  maintenanceType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_INTERVAL_TYPE_MAX)
  intervalType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_VEHICLE_APPLICABILITY_MAX)
  vehicleApplicability?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_MAINTENANCE_SCHEDULE_DESCRIPTION_MAX)
  description?: string | null;
}
