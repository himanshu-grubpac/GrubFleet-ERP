import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  DECIMAL_MONEY_PATTERN,
  DECIMAL_MONEY_PATTERN_MESSAGE,
} from '@grubpac/validation';
import { IsValidChassisVin } from '../../../common/decorators/is-valid-chassis-vin.decorator';
import { IsValidVehicleRegistrationNumber } from '../../../common/decorators/is-valid-vehicle-registration-number.decorator';
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

  @ApiPropertyOptional({
    maxLength: ASSET_REGISTER_VEHICLE_REGISTRATION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_REGISTER_VEHICLE_REGISTRATION_MAX_LENGTH)
  @IsValidVehicleRegistrationNumber()
  registrationNumber?: string;

  @ApiPropertyOptional({ maxLength: ASSET_REGISTER_VEHICLE_CHASSIS_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_REGISTER_VEHICLE_CHASSIS_MAX_LENGTH)
  @IsValidChassisVin()
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

  @ApiPropertyOptional({ example: '12000.00' })
  @IsOptional()
  @IsString()
  @Matches(DECIMAL_MONEY_PATTERN, { message: DECIMAL_MONEY_PATTERN_MESSAGE })
  insurancePremium?: string;

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
