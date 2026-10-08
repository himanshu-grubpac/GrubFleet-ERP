import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ASSET_REGISTER_BULK_ASSIGN_MAX_VEHICLES } from '../constants/asset-register-assignment.constants';

export class BulkAssignAssetRegisterVehiclesDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsUUID()
  leaseContractId!: string;

  @ApiPropertyOptional({
    description:
      'Organisation client register id — stored for future org↔fleet link; not validated against lease contract client until link ships.',
  })
  @IsOptional()
  @IsUUID()
  organisationClientId?: string;

  @ApiProperty({
    type: [String],
    maxItems: ASSET_REGISTER_BULK_ASSIGN_MAX_VEHICLES,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ASSET_REGISTER_BULK_ASSIGN_MAX_VEHICLES)
  @IsUUID('4', { each: true })
  vehicleIds!: string[];
}
