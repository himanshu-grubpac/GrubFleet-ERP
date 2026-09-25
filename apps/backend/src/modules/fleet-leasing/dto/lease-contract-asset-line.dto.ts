import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class LeaseContractAssetLineDto {
  @ApiProperty({ example: 'Sedan' })
  @IsString()
  @MaxLength(64)
  assetClass!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  committedQuantity!: number;

  @ApiProperty({ example: '34500.00' })
  @IsString()
  ratePerVehicleMonth!: string;
}
