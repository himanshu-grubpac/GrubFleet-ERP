import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ASSET_REGISTER_VEHICLE_DEACTIVATE_REASON_MAX_LENGTH } from '../constants/asset-register-vehicle.constants';

export class UpdateAssetRegisterVehicleStatusDto {
  @ApiProperty({ enum: ['activate', 'deactivate'] })
  @IsIn(['activate', 'deactivate'])
  action!: 'activate' | 'deactivate';

  @ApiPropertyOptional({
    description: 'Required when action is deactivate',
  })
  @ValidateIf(
    (o: UpdateAssetRegisterVehicleStatusDto) => o.action === 'deactivate',
  )
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_REGISTER_VEHICLE_DEACTIVATE_REASON_MAX_LENGTH)
  reason?: string;
}
