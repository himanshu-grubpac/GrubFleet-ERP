import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ORGANISATION_DRIVER_FIELD_LIMITS as L } from '../constants/driver-field.constants';

export class AssignDriverVehicleDto {
  @ApiProperty({ maxLength: L.assignedVehicleCode })
  @IsString()
  @MinLength(1)
  @MaxLength(L.assignedVehicleCode)
  vehicleCode!: string;

  @ApiProperty({ maxLength: L.assignedVehicleAssetClass })
  @IsString()
  @MinLength(1)
  @MaxLength(L.assignedVehicleAssetClass)
  assetClass!: string;

  @ApiProperty({ maxLength: L.assignedActiveLeaseId })
  @IsString()
  @MinLength(1)
  @MaxLength(L.assignedActiveLeaseId)
  activeLeaseId!: string;

  @ApiPropertyOptional({
    description: 'When true, assignment is tied to the active lease contract',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  vehicleTiedToContract?: boolean;
}
