import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListRenewalsExtensionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ description: 'Contract ID or client name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
