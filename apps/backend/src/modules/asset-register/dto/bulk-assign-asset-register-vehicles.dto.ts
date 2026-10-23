import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { IsNotAfterLocalToday } from '../../../common/decorators/local-calendar-date-bounds.decorator';
import {
  ASSET_REGISTER_ASSIGNMENT_HANDOVER_LOCATION_MAX_LENGTH,
  ASSET_REGISTER_ASSIGNMENT_NOTES_MAX_LENGTH,
  ASSET_REGISTER_BULK_ASSIGN_MAX_VEHICLES,
} from '../constants/asset-register-assignment.constants';

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

  @ApiPropertyOptional({
    description:
      'Handover calendar date (ISO YYYY-MM-DD). Must not be after today. Defaults to assignment time when omitted.',
  })
  @IsOptional()
  @IsDateString()
  @IsNotAfterLocalToday()
  handoverDate?: string;

  @ApiPropertyOptional({
    description:
      'Odometer reading at handover; updates fleet register vehicle when set',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  odometerAtHandover?: number;

  @ApiPropertyOptional({
    description: 'Handover depot or location label for this batch',
    maxLength: ASSET_REGISTER_ASSIGNMENT_HANDOVER_LOCATION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_REGISTER_ASSIGNMENT_HANDOVER_LOCATION_MAX_LENGTH)
  handoverLocation?: string;

  @ApiPropertyOptional({
    description: 'Optional notes stored on each assignment in the batch',
    maxLength: ASSET_REGISTER_ASSIGNMENT_NOTES_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_REGISTER_ASSIGNMENT_NOTES_MAX_LENGTH)
  notes?: string;
}
