import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ORGANISATION_LIST_SEARCH_MAX_LENGTH } from '../constants/organisation-field.constants';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  type ListSortOrder,
} from '../../../common/dto/pagination-query.dto';
import { LIST_SORT_ORDERS } from '../../../common/constants/list-sort.constants';
import {
  SUPPLIER_LIST_SORT_FIELDS,
  type SupplierListSortField,
} from '../constants/organisation-list-sort.constants';
import {
  ORGANISATION_SUPPLIER_TYPES,
  type OrganisationSupplierType,
} from '../constants/supplier-type.constants';

export const SUPPLIER_LIST_MAX_PAGE_SIZE = 50;

export class ListSuppliersQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ minimum: 1, default: DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: SUPPLIER_LIST_MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SUPPLIER_LIST_MAX_PAGE_SIZE)
  pageSize?: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ maxLength: ORGANISATION_LIST_SEARCH_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(ORGANISATION_LIST_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({
    enum: [...ORGANISATION_SUPPLIER_TYPES, 'spareparts'],
    description: 'Filter by supplier type (`spareparts` alias for spare_parts)',
  })
  @IsOptional()
  @IsIn([...ORGANISATION_SUPPLIER_TYPES, 'spareparts'])
  supplierType?: OrganisationSupplierType | 'spareparts';

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({ enum: SUPPLIER_LIST_SORT_FIELDS })
  @IsOptional()
  @IsIn(SUPPLIER_LIST_SORT_FIELDS)
  sortBy?: SupplierListSortField;

  @ApiPropertyOptional({ enum: LIST_SORT_ORDERS })
  @IsOptional()
  @IsIn(LIST_SORT_ORDERS)
  sortOrder?: ListSortOrder;
}
