import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const DEACTIVATE_REASON_TYPES = [
  'resignation',
  'termination',
  'end_of_contract',
  'other',
] as const;

export class UpdateEmployeeStatusDto {
  @ApiProperty({ enum: ['activate', 'deactivate'] })
  @IsIn(['activate', 'deactivate'])
  action!: 'activate' | 'deactivate';

  @ApiPropertyOptional({
    enum: DEACTIVATE_REASON_TYPES,
    description: 'Required when action is deactivate',
  })
  @IsOptional()
  @IsIn(DEACTIVATE_REASON_TYPES)
  reasonType?: (typeof DEACTIVATE_REASON_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
