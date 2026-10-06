import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ASSET_MASTER_NAME_MAX_LENGTH } from '../constants/asset-master.constants';

export class UpdateAssetMasterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetClassId?: string;

  @ApiPropertyOptional({ maxLength: ASSET_MASTER_NAME_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_MASTER_NAME_MAX_LENGTH)
  name?: string;
}
