import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ASSET_REGISTER_VEHICLE_TYPES } from '../../asset-register/constants/asset-class.constants';

export class ReplacementFilterOptionsQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ enum: ASSET_REGISTER_VEHICLE_TYPES })
  @IsIn([...ASSET_REGISTER_VEHICLE_TYPES])
  vehicleType!: (typeof ASSET_REGISTER_VEHICLE_TYPES)[number];

  @ApiPropertyOptional({
    description: 'When set, returns distinct model names for this brand',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;
}
