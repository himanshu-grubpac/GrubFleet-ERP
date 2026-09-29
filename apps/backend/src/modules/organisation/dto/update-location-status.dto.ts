import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdateLocationStatusDto {
  @ApiProperty({ enum: ['activate', 'deactivate'] })
  @IsIn(['activate', 'deactivate'])
  action!: 'activate' | 'deactivate';

  @ApiPropertyOptional({
    description: 'Required when action is deactivate',
  })
  @ValidateIf((o: UpdateLocationStatusDto) => o.action === 'deactivate')
  @IsString()
  @MinLength(1)
  reason?: string;
}
