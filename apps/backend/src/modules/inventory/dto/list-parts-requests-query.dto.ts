import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ListInventoryQueryDto } from './list-inventory-query.dto';

export class ListPartsRequestsQueryDto extends ListInventoryQueryDto {
  @ApiPropertyOptional({
    enum: ['blocked', 'fulfilled', 'reserved', 'cancelled', 'lapsed'],
  })
  @IsOptional()
  @IsIn(['blocked', 'fulfilled', 'reserved', 'cancelled', 'lapsed'])
  requestStatus?: 'blocked' | 'fulfilled' | 'reserved' | 'cancelled' | 'lapsed';
}
