import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ASSET_REGISTER_BULK_ASSIGN_MAX_VEHICLES } from '../constants/asset-register-assignment.constants';

export class BulkAssignValidateDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsUUID()
  leaseContractId!: string;

  @ApiProperty({
    type: [String],
    maxItems: ASSET_REGISTER_BULK_ASSIGN_MAX_VEHICLES,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ASSET_REGISTER_BULK_ASSIGN_MAX_VEHICLES)
  @IsUUID('4', { each: true })
  vehicleIds!: string[];

  @ApiPropertyOptional({
    description:
      'Asset class id for replacement pool count; inferred from vehicles when omitted',
  })
  @IsOptional()
  @IsUUID()
  assetClassId?: string;
}
