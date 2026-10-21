import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  FLEET_ASSET_CLASS_LIST_SORT_FIELDS,
  type FleetAssetClassListSortField,
} from '../constants/fleet-leasing-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';

export class ListFleetAssetClassesQueryDto extends PaginationQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;
  @SortByQuery(FLEET_ASSET_CLASS_LIST_SORT_FIELDS)
  sortBy?: FleetAssetClassListSortField;
}
