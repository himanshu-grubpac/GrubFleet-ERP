import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class SendClientStatementDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  periodStart!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  periodEnd!: string;
}
