import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ASSET_MASTER_DEACTIVATE_REASON_MAX_LENGTH } from '../constants/asset-master.constants';

export class UpdateAssetMasterStatusDto {
  @ApiProperty({ enum: ['activate', 'deactivate'] })
  @IsIn(['activate', 'deactivate'])
  action!: 'activate' | 'deactivate';

  @ApiPropertyOptional({
    description: 'Required when action is deactivate',
  })
  @ValidateIf((o: UpdateAssetMasterStatusDto) => o.action === 'deactivate')
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_MASTER_DEACTIVATE_REASON_MAX_LENGTH)
  reason?: string;
}
