import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  FLEET_CLIENT_LIST_SORT_FIELDS,
  type FleetClientListSortField,
} from '../constants/fleet-leasing-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';

export class ListFleetClientsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({
    description: 'Search company name or point-of-contact name/email',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
  @SortByQuery(FLEET_CLIENT_LIST_SORT_FIELDS)
  sortBy?: FleetClientListSortField;
}
