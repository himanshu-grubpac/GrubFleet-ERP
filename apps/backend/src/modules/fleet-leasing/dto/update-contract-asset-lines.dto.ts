import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LeaseContractAssetLineDto } from './lease-contract-asset-line.dto';

export class UpdateContractAssetLinesDto {
  @ApiProperty({ type: [LeaseContractAssetLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LeaseContractAssetLineDto)
  assetLines!: LeaseContractAssetLineDto[];

  @ApiPropertyOptional({
    description:
      'Required when any line has shortfall — saves lines as Awaiting Assets',
  })
  @IsOptional()
  @IsBoolean()
  confirmShortfall?: boolean;
}
