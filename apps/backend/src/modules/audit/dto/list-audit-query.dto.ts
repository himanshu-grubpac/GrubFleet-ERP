import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  AUDIT_LIST_SORT_FIELDS,
  type AuditListSortField,
} from '../constants/audit-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';

export class ListAuditQueryDto extends PaginationQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;
  @SortByQuery(AUDIT_LIST_SORT_FIELDS)
  sortBy?: AuditListSortField;
}
