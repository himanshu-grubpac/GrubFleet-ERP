import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListClientStatementsQueryDto extends PaginationQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({
    format: 'date',
    description: 'Inclusive period start (ISO date)',
  })
  @IsDateString({ strict: true })
  periodStart!: string;

  @ApiProperty({
    format: 'date',
    description: 'Inclusive period end (ISO date)',
  })
  @IsDateString({ strict: true })
  periodEnd!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class ClientStatementDetailQueryDto extends PaginationQueryDto {
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
