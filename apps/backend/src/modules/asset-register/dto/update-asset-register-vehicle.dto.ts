import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  ASSET_REGISTER_VEHICLE_CHASSIS_MAX_LENGTH,
  ASSET_REGISTER_VEHICLE_MODEL_YEAR_MAX,
  ASSET_REGISTER_VEHICLE_MODEL_YEAR_MIN,
  ASSET_REGISTER_VEHICLE_ODOMETER_MAX,
  ASSET_REGISTER_VEHICLE_REGISTRATION_MAX_LENGTH,
  ASSET_REGISTER_VEHICLE_SPECIAL_NOTES_MAX_LENGTH,
} from '../constants/asset-register-vehicle.constants';

export class UpdateAssetRegisterVehicleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetClassId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetMasterId?: string;

  @ApiPropertyOptional({
    maxLength: ASSET_REGISTER_VEHICLE_REGISTRATION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_REGISTER_VEHICLE_REGISTRATION_MAX_LENGTH)
  registrationNumber?: string;

  @ApiPropertyOptional({ maxLength: ASSET_REGISTER_VEHICLE_CHASSIS_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_REGISTER_VEHICLE_CHASSIS_MAX_LENGTH)
  chassisNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(ASSET_REGISTER_VEHICLE_MODEL_YEAR_MIN)
  @Max(ASSET_REGISTER_VEHICLE_MODEL_YEAR_MAX)
  modelYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(ASSET_REGISTER_VEHICLE_ODOMETER_MAX)
  odometer?: number;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  registrationStartDate?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  registrationEndDate?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  insuranceStartDate?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  insuranceEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  insurancePremium?: number;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  warrantyStartDate?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  warrantyEndDate?: string;

  @ApiPropertyOptional({
    maxLength: ASSET_REGISTER_VEHICLE_SPECIAL_NOTES_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_REGISTER_VEHICLE_SPECIAL_NOTES_MAX_LENGTH)
  specialNotes?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  purchaseInvoiceId?: string | null;
}
