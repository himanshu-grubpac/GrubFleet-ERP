import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const LEASE_CLOSING_REASONS = [
  'completed',
  'terminated_early',
  'cancelled',
] as const;

export type LeaseClosingReason = (typeof LEASE_CLOSING_REASONS)[number];

export const LEASE_RETURN_METHODS = [
  'client_depot',
  'collect_from_site',
] as const;

export type LeaseReturnMethod = (typeof LEASE_RETURN_METHODS)[number];

export class InitiateReturnsDto {
  @ApiProperty({ enum: LEASE_CLOSING_REASONS })
  @IsIn(LEASE_CLOSING_REASONS)
  closingReason!: LeaseClosingReason;

  @ApiProperty({ format: 'date', example: '2026-10-31' })
  @IsDateString()
  leaseEndDate!: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'uuid' },
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  vehicleIds!: string[];

  @ApiProperty({ enum: LEASE_RETURN_METHODS })
  @IsIn(LEASE_RETURN_METHODS)
  returnMethod!: LeaseReturnMethod;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  returnDepotLocationId?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  returnDepotLabel?: string;

  @ApiProperty({ format: 'date', example: '2026-10-31' })
  @IsDateString()
  expectedReturnBy!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
