import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListClientStatementsQueryDto extends PaginationQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({
    format: 'date',
    description: 'Inclusive period start (ISO date)',
  })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({
    format: 'date',
    description: 'Inclusive period end (ISO date)',
  })
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @MaxLength(120)
  search?: string;
}

export class ClientStatementDetailQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  periodEnd!: string;
}
