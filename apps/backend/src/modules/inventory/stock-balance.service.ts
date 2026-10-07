import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import type { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import { InventoryRepository } from './repositories/inventory.repository';

function stockStatus(
  onHand: number,
  threshold: number,
): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  if (onHand <= 0) return 'Out of Stock';
  if (onHand <= threshold) return 'Low Stock';
  return 'In Stock';
}

@Injectable()
export class StockBalanceService {
  constructor(private readonly repo: InventoryRepository) {}

  async list(query: ListInventoryQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } = await this.repo.listStockBalanceParts(
      query.organizationId,
      page,
      pageSize,
      query.search,
    );
    const items = await Promise.all(
      rows.map(async (part) => {
        const locations = await this.repo.quantityByPartAndLocation(
          query.organizationId,
          part.id,
        );
        return {
          id: part.id,
          partName: part.name,
          partNumber: part.partCode ?? '—',
          unit: part.unitOfMeasure,
          threshold: part.reorderThreshold,
          locations: locations.map((loc) => ({
            location: loc.locationName,
            quantity: Number(loc.quantity ?? 0),
          })),
          stockStatus: stockStatus(
            locations.reduce((sum, l) => sum + Number(l.quantity ?? 0), 0),
            part.reorderThreshold,
          ),
        };
      }),
    );
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, partId: string) {
    const part = await this.repo.getSparePartInOrg(organizationId, partId);
    if (!part) throw new NotFoundException('Stock balance not found');
    const locations = await this.repo.quantityByPartAndLocation(
      organizationId,
      partId,
    );
    const onHand = locations.reduce(
      (sum, l) => sum + Number(l.quantity ?? 0),
      0,
    );
    return {
      id: part.id,
      partName: part.name,
      partNumber: part.partCode ?? '—',
      unit: part.unitOfMeasure,
      threshold: part.reorderThreshold,
      onHand,
      stockStatus: stockStatus(onHand, part.reorderThreshold),
      locations: locations.map((loc) => ({
        location: loc.locationName,
        quantity: Number(loc.quantity ?? 0),
      })),
    };
  }
}
