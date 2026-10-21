import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PreviewAssetAvailabilityLineDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assetClassId?: string;

  @ApiPropertyOptional({ example: '2026_activa_150_petrol_efi_bl' })
  @ValidateIf((line: PreviewAssetAvailabilityLineDto) => !line.assetClassId)
  @IsString()
  @MaxLength(64)
  assetClass?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  committedQuantity!: number;
}

export class PreviewAssetAvailabilityBatchDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ type: [PreviewAssetAvailabilityLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PreviewAssetAvailabilityLineDto)
  lines!: PreviewAssetAvailabilityLineDto[];
}
