import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ASSET_CLASS_DEACTIVATE_REASON_MAX_LENGTH } from '../constants/asset-class.constants';

export class UpdateAssetClassStatusDto {
  @ApiProperty({ enum: ['activate', 'deactivate'] })
  @IsIn(['activate', 'deactivate'])
  action!: 'activate' | 'deactivate';

  @ApiPropertyOptional({
    description: 'Required when action is deactivate',
  })
  @ValidateIf((o: UpdateAssetClassStatusDto) => o.action === 'deactivate')
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_CLASS_DEACTIVATE_REASON_MAX_LENGTH)
  reason?: string;
}
