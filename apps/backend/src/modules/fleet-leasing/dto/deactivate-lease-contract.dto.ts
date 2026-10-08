import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { ORGANISATION_DEACTIVATE_REASON_MAX_LENGTH } from '../../organisation/constants/organisation-deactivate.constants';

export class DeactivateLeaseContractDto {
  @ApiProperty({ description: 'Reason for deactivation (audit trail)' })
  @IsString()
  @MinLength(1)
  @MaxLength(ORGANISATION_DEACTIVATE_REASON_MAX_LENGTH)
  reason!: string;
}
