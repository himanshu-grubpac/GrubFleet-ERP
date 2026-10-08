import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ASSET_MASTER_NAME_MAX_LENGTH } from '../constants/asset-master.constants';

export class CreateAssetMasterDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsUUID()
  assetClassId!: string;

  @ApiProperty({ maxLength: ASSET_MASTER_NAME_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_MASTER_NAME_MAX_LENGTH)
  name!: string;
}
