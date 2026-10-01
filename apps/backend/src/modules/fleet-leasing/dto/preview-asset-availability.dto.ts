import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PreviewAssetAvailabilityLineDto {
  @ApiProperty({ example: 'Petrol Scooter — Standard' })
  @IsString()
  @MaxLength(64)
  assetClass!: string;

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
