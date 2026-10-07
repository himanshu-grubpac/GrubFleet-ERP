import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import type { ListPartsRequestsQueryDto } from './dto/list-parts-requests-query.dto';
import { InventoryRepository } from './repositories/inventory.repository';

const STATUS_UI: Record<string, 'Blocked' | 'Fulfilled'> = {
  blocked: 'Blocked',
  fulfilled: 'Fulfilled',
  reserved: 'Blocked',
  cancelled: 'Blocked',
  lapsed: 'Blocked',
};

@Injectable()
export class PartsRequestsService {
  constructor(private readonly repo: InventoryRepository) {}

  async list(query: ListPartsRequestsQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } = await this.repo.listPartsRequests(
      query.organizationId,
      page,
      pageSize,
      { search: query.search, status: query.requestStatus },
    );
    const partIds = [...new Set(rows.map((r) => r.partId))];
    const locationIds = [
      ...new Set(rows.map((r) => r.locationId).filter(Boolean) as string[]),
    ];
    const [parts, locations] = await Promise.all([
      this.repo.getPartsByIds(query.organizationId, partIds),
      this.repo.getLocationsByIds(query.organizationId, locationIds),
    ]);
    const partMap = new Map(parts.map((p) => [p.id, p]));
    const locMap = new Map(locations.map((l) => [l.id, l.name]));
    const items = rows.map((row) => {
      const part = partMap.get(row.partId);
      return {
        id: row.id,
        date: row.requestedAt.toISOString().slice(0, 10),
        workOrder: row.workOrderRef,
        part: part?.name ?? '—',
        quantity: row.quantityRequested,
        unit: part?.unitOfMeasure?.toLowerCase() ?? 'each',
        location: row.locationId ? (locMap.get(row.locationId) ?? '—') : '—',
        requestType:
          row.requestType === 'external'
            ? ('External' as const)
            : ('Internal' as const),
        vehicle: row.vehicleRef ?? '—',
        status: STATUS_UI[row.status] ?? 'Blocked',
      };
    });
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, requestId: string) {
    const row = await this.repo.getPartsRequestInOrg(organizationId, requestId);
    if (!row) throw new NotFoundException('Parts request not found');
    const [part] = await this.repo.getPartsByIds(organizationId, [row.partId]);
    const locations = row.locationId
      ? await this.repo.getLocationsByIds(organizationId, [row.locationId])
      : [];
    return {
      id: row.id,
      requestNumber: row.requestNumber,
      date: row.requestedAt.toISOString().slice(0, 10),
      workOrder: row.workOrderRef,
      part: part?.name ?? '—',
      partId: row.partId,
      quantity: row.quantityRequested,
      unit: part?.unitOfMeasure ?? 'Each',
      location: locations[0]?.name ?? '—',
      requestType:
        row.requestType === 'external'
          ? ('External' as const)
          : ('Internal' as const),
      vehicle: row.vehicleRef ?? '—',
      status: STATUS_UI[row.status] ?? 'Blocked',
      rawStatus: row.status,
      compatibilityOk: row.compatibilityOk,
    };
  }
}
