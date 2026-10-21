import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { IsValidChassisVin } from '../../../common/decorators/is-valid-chassis-vin.decorator';
import { IsValidVehicleRegistrationNumber } from '../../../common/decorators/is-valid-vehicle-registration-number.decorator';

export class CreateFleetVehicleDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  @IsValidChassisVin()
  vin!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(32)
  @IsValidVehicleRegistrationNumber()
  registrationNo!: string;

  @ApiProperty()
  @IsDateString({ strict: true })
  registrationExpiry!: string;

  @ApiProperty()
  @IsDateString({ strict: true })
  insuranceExpiry!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  odometer?: number;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  assetClass!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
}
