import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const ASSIGNABLE_LEASE_CONTRACTS_MAX_PAGE_SIZE = 50;

export class ListAssignableLeaseContractsForVehicleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  vehicleId!: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: ASSIGNABLE_LEASE_CONTRACTS_MAX_PAGE_SIZE,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ASSIGNABLE_LEASE_CONTRACTS_MAX_PAGE_SIZE)
  override pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by organisation client register id' })
  @IsOptional()
  @IsUUID()
  organisationClientId?: string;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;
}
