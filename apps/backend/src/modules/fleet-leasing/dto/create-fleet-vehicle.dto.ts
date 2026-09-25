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

export class CreateFleetVehicleDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  vin!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(32)
  registrationNo!: string;

  @ApiProperty()
  @IsDateString()
  registrationExpiry!: string;

  @ApiProperty()
  @IsDateString()
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
