import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ORGANISATION_DEACTIVATE_REASON_MAX_LENGTH } from '../constants/organisation-deactivate.constants';

export class UpdateSupplierStatusDto {
  @ApiProperty({ enum: ['activate', 'deactivate'] })
  @IsIn(['activate', 'deactivate'])
  action!: 'activate' | 'deactivate';

  @ApiPropertyOptional({
    description: 'Required when action is deactivate',
  })
  @ValidateIf((o: UpdateSupplierStatusDto) => o.action === 'deactivate')
  @IsString()
  @MinLength(1)
  @MaxLength(ORGANISATION_DEACTIVATE_REASON_MAX_LENGTH)
  reason?: string;
}
