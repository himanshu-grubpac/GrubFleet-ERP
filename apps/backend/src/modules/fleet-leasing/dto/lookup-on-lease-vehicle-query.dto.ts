import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import {
  SUPPORT_REPLACEMENT_VEHICLE_STORES,
  type SupportReplacementVehicleStore,
} from '../constants/support-replacement-vehicle-store';

export class LookupOnLeaseVehicleQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({
    description: 'Registration number, or VIN when chassis search is used',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  q!: string;

  @ApiPropertyOptional({
    enum: SUPPORT_REPLACEMENT_VEHICLE_STORES,
    description:
      'For available-replacement lookup: restrict results to the same catalog as the on-lease unit',
  })
  @IsOptional()
  @IsIn([...SUPPORT_REPLACEMENT_VEHICLE_STORES])
  sourceKind?: SupportReplacementVehicleStore;
}
