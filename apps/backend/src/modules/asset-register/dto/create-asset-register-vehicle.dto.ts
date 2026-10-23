import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsDecimalMoneyAmount } from '../../../common/decorators/is-decimal-money-amount.decorator';
import { IsValidChassisVin } from '../../../common/decorators/is-valid-chassis-vin.decorator';
import { IsValidVehicleRegistrationNumber } from '../../../common/decorators/is-valid-vehicle-registration-number.decorator';
import { MaxCurrentLocalCalendarYear } from '../../../common/decorators/local-calendar-date-bounds.decorator';
import {
  ASSET_REGISTER_VEHICLE_CHASSIS_MAX_LENGTH,
  ASSET_REGISTER_VEHICLE_MODEL_YEAR_MIN,
  ASSET_REGISTER_VEHICLE_ODOMETER_MAX,
  ASSET_REGISTER_VEHICLE_REGISTRATION_MAX_LENGTH,
  ASSET_REGISTER_VEHICLE_SPECIAL_NOTES_MAX_LENGTH,
} from '../constants/asset-register-vehicle.constants';

export class CreateAssetRegisterVehicleDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsUUID()
  assetClassId!: string;

  @ApiProperty({ maxLength: ASSET_REGISTER_VEHICLE_REGISTRATION_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_REGISTER_VEHICLE_REGISTRATION_MAX_LENGTH)
  @IsValidVehicleRegistrationNumber()
  registrationNumber!: string;

  @ApiProperty({ maxLength: ASSET_REGISTER_VEHICLE_CHASSIS_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_REGISTER_VEHICLE_CHASSIS_MAX_LENGTH)
  @IsValidChassisVin()
  chassisNumber!: string;

  @ApiProperty({
    minimum: ASSET_REGISTER_VEHICLE_MODEL_YEAR_MIN,
    description: 'Calendar year; must not be after the current year',
  })
  @IsInt()
  @Min(ASSET_REGISTER_VEHICLE_MODEL_YEAR_MIN)
  @MaxCurrentLocalCalendarYear()
  modelYear!: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(ASSET_REGISTER_VEHICLE_ODOMETER_MAX)
  odometer!: number;

  @ApiProperty({ format: 'date', example: '2024-01-15' })
  @IsDateString({ strict: true })
  registrationStartDate!: string;

  @ApiProperty({ format: 'date', example: '2029-01-14' })
  @IsDateString({ strict: true })
  registrationEndDate!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  insuranceStartDate!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  insuranceEndDate!: string;

  @ApiProperty({
    example: 12000,
    description: 'INR major units (max 2 decimal places)',
  })
  @IsDecimalMoneyAmount()
  insurancePremium!: number;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  warrantyStartDate!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  warrantyEndDate!: string;

  @ApiPropertyOptional({
    maxLength: ASSET_REGISTER_VEHICLE_SPECIAL_NOTES_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_REGISTER_VEHICLE_SPECIAL_NOTES_MAX_LENGTH)
  specialNotes?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  purchaseInvoiceId?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Organisation supplier (compliance / insurance).',
  })
  @IsOptional()
  @IsUUID()
  insuranceSupplierId?: string;
}
