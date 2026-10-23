import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const FLEET_RETURN_FUEL_LEVELS = [
  'empty',
  'quarter',
  'half',
  'three_quarter',
  'full',
] as const;

export type FleetReturnFuelLevel = (typeof FLEET_RETURN_FUEL_LEVELS)[number];

export const FLEET_RETURN_CONDITION_AT_GLANCE = [
  'looks_fine',
  'visible_damage',
] as const;

export const FLEET_RETURN_GATE_PHOTO_SLOTS = [
  'front',
  'rear',
  'left',
  'right',
] as const;

export class FleetReturnDocumentsChecklistDto {
  @ApiProperty()
  @IsBoolean()
  rcBook!: boolean;

  @ApiProperty()
  @IsBoolean()
  insuranceCopy!: boolean;

  @ApiProperty()
  @IsBoolean()
  pucCertificate!: boolean;

  @ApiProperty()
  @IsBoolean()
  goodsPermit!: boolean;
}

export class FleetReturnGatePhotoDto {
  @ApiProperty({ enum: FLEET_RETURN_GATE_PHOTO_SLOTS })
  @IsIn([...FLEET_RETURN_GATE_PHOTO_SLOTS])
  slot!: (typeof FLEET_RETURN_GATE_PHOTO_SLOTS)[number];

  @ApiProperty()
  @IsISO8601()
  capturedAt!: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  label?: string;
}

export class ReceiveReturnDto {
  @ApiProperty({ description: 'Gate-in timestamp (ISO 8601)' })
  @IsISO8601()
  receivedAt!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  receivedByEmployeeId?: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  broughtInBy!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(9_999_999)
  odometerReading!: number;

  @ApiProperty({ enum: FLEET_RETURN_FUEL_LEVELS })
  @IsIn([...FLEET_RETURN_FUEL_LEVELS])
  fuelLevel!: FleetReturnFuelLevel;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(99)
  keysReceived!: number;

  @ApiProperty({ type: FleetReturnDocumentsChecklistDto })
  @ValidateNested()
  @Type(() => FleetReturnDocumentsChecklistDto)
  documentsChecklist!: FleetReturnDocumentsChecklistDto;

  @ApiProperty({ type: [FleetReturnGatePhotoDto] })
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => FleetReturnGatePhotoDto)
  gatePhotos!: FleetReturnGatePhotoDto[];

  @ApiProperty({ enum: FLEET_RETURN_CONDITION_AT_GLANCE })
  @IsIn([...FLEET_RETURN_CONDITION_AT_GLANCE])
  conditionAtGlance!: (typeof FLEET_RETURN_CONDITION_AT_GLANCE)[number];

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  gateNote?: string;

  @ApiProperty({
    description:
      'When true, user proceeds to detailed inspection (Screen 4) after gate-in',
  })
  @IsBoolean()
  inspectImmediately!: boolean;
}
