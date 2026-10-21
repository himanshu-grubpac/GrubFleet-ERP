import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ORGANISATION_DEACTIVATE_REASON_MAX_LENGTH } from '../../organisation/constants/organisation-deactivate.constants';

export class UpdateLaborJobCardStatusDto {
  @ApiProperty({ enum: ['activate', 'deactivate'] })
  @IsIn(['activate', 'deactivate'])
  action!: 'activate' | 'deactivate';

  @ApiPropertyOptional({ description: 'Required when action is deactivate' })
  @ValidateIf((o: UpdateLaborJobCardStatusDto) => o.action === 'deactivate')
  @IsString()
  @MinLength(1)
  @MaxLength(ORGANISATION_DEACTIVATE_REASON_MAX_LENGTH)
  reason?: string;
}
