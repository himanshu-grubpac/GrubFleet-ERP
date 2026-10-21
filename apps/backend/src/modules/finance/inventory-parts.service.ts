import { Injectable } from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import type { CreateInventoryPartDto } from './dto/create-inventory-part.dto';
import type { ListInventoryPartsQueryDto } from './dto/list-inventory-parts-query.dto';
import { FinanceRepository } from './repositories/finance.repository';

@Injectable()
export class InventoryPartsService {
  constructor(private readonly repo: FinanceRepository) {}

  async list(query: ListInventoryPartsQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } = await this.repo.listInventoryParts(
      query.organizationId,
      page,
      pageSize,
      query.search,
    );
    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      partCode: row.partCode,
    }));
    return toPaginatedResult(items, page, pageSize, total);
  }

  async create(dto: CreateInventoryPartDto) {
    const name = dto.name.trim();
    const row = await this.repo.createInventoryPart({
      organizationId: dto.organizationId,
      name,
      partCode: dto.partCode?.trim() || null,
      isActive: true,
    });
    return {
      id: row.id,
      name: row.name,
      partCode: row.partCode,
    };
  }
}
