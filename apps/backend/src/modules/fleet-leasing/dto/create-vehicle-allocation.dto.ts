import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateVehicleAllocationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  vehicleId!: string;

  @ApiPropertyOptional({
    description: 'Required when reassigning from another active contract',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  reassignmentConfirmation?: string;

  @ApiProperty({
    type: [String],
    description: 'User ids or email addresses to notify (logged for v1)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  notifiedStakeholders!: string[];
}
