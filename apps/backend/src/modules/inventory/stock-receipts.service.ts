import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { AuditService } from '../audit/audit.service';
import type { CreateStockReceiptDto } from './dto/create-stock-receipt.dto';
import type { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import type { UpdateStockReceiptDto } from './dto/update-stock-receipt.dto';
import type { UpdateStockReceiptStatusDto } from './dto/update-stock-receipt-status.dto';
import { InventoryRepository } from './repositories/inventory.repository';

@Injectable()
export class StockReceiptsService {
  constructor(
    private readonly repo: InventoryRepository,
    private readonly audit: AuditService,
  ) {}

  private async enrichReceipt(
    organizationId: string,
    row: NonNullable<
      Awaited<ReturnType<InventoryRepository['getStockReceiptInOrg']>>
    >,
  ) {
    const [part] = await this.repo.getPartsByIds(organizationId, [row.partId]);
    const locations = await this.repo.getLocationsByIds(organizationId, [
      row.locationId,
    ]);
    const partLabel = part
      ? `${part.name}${part.partCode ? ` — ${part.partCode}` : ''}`
      : '—';
    return {
      id: row.id,
      receiptNumber: row.receiptNumber,
      partId: row.partId,
      partLabel,
      supplierId: row.supplierId,
      locationId: row.locationId,
      locationName: locations[0]?.name ?? '—',
      purchaseInvoiceReference: row.purchaseInvoiceReference,
      purchaseDate: row.purchaseDate,
      expiryDate: row.expiryDate,
      quantityReceived: row.quantityReceived,
      unitCostMinor: row.unitCostMinor,
      batchLotReference: row.batchLotReference,
      notes: row.notes,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
      availableActions: { edit: row.isActive },
    };
  }

  async list(query: ListInventoryQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const isActive =
      query.status === 'active'
        ? true
        : query.status === 'inactive'
          ? false
          : undefined;
    const { rows, total } = await this.repo.listStockReceipts(
      query.organizationId,
      page,
      pageSize,
      { search: query.search, isActive },
    );
    const partIds = [...new Set(rows.map((r) => r.partId))];
    const parts = await this.repo.getPartsByIds(query.organizationId, partIds);
    const partMap = new Map(parts.map((p) => [p.id, p]));
    const items = rows.map((row) => {
      const part = partMap.get(row.partId);
      return {
        id: row.id,
        receiptNumber: row.receiptNumber,
        partName: part?.name ?? '—',
        partNumber: part?.partCode ?? '—',
        quantity: row.quantityReceived,
        purchaseDate: row.purchaseDate,
        batchReference: row.batchLotReference ?? '—',
        status: row.isActive ? ('active' as const) : ('inactive' as const),
        availableActions: { edit: row.isActive },
      };
    });
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, receiptId: string) {
    const row = await this.repo.getStockReceiptInOrg(organizationId, receiptId);
    if (!row) throw new NotFoundException('Stock receipt not found');
    return this.enrichReceipt(organizationId, row);
  }

  async create(dto: CreateStockReceiptDto) {
    const part = await this.repo.getSparePartInOrg(
      dto.organizationId,
      dto.partId,
    );
    if (!part) throw new BadRequestException('Part not found in organization');
    if (!part.isActive) {
      throw new BadRequestException('Cannot receive stock for inactive part');
    }
    const receiptNumber = await this.repo.nextReceiptNumber(dto.organizationId);
    const row = await this.repo.insertStockReceipt({
      organizationId: dto.organizationId,
      receiptNumber,
      partId: dto.partId,
      supplierId: dto.supplierId ?? null,
      locationId: dto.locationId,
      purchaseInvoiceReference: dto.purchaseInvoiceReference?.trim() || null,
      financeInvoiceId: dto.financeInvoiceId ?? null,
      purchaseDate: dto.purchaseDate,
      expiryDate: dto.expiryDate ?? null,
      quantityReceived: dto.quantityReceived,
      unitCostMinor: dto.quantityUnitCostMinor,
      batchLotReference: dto.batchLotReference?.trim() || null,
      notes: dto.notes?.trim() || null,
      isActive: true,
    });
    return this.enrichReceipt(dto.organizationId, row);
  }

  async update(
    organizationId: string,
    receiptId: string,
    dto: UpdateStockReceiptDto,
  ) {
    const existing = await this.repo.getStockReceiptInOrg(
      organizationId,
      receiptId,
    );
    if (!existing) throw new NotFoundException('Stock receipt not found');
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive stock receipt cannot be edited until reactivated',
      );
    }
    const updated = await this.repo.updateStockReceipt(
      organizationId,
      receiptId,
      {
        ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId } : {}),
        ...(dto.locationId !== undefined ? { locationId: dto.locationId } : {}),
        ...(dto.purchaseInvoiceReference !== undefined
          ? {
              purchaseInvoiceReference:
                dto.purchaseInvoiceReference.trim() || null,
            }
          : {}),
        ...(dto.financeInvoiceId !== undefined
          ? { financeInvoiceId: dto.financeInvoiceId }
          : {}),
        ...(dto.purchaseDate !== undefined
          ? { purchaseDate: dto.purchaseDate }
          : {}),
        ...(dto.expiryDate !== undefined ? { expiryDate: dto.expiryDate } : {}),
        ...(dto.quantityReceived !== undefined
          ? { quantityReceived: dto.quantityReceived }
          : {}),
        ...(dto.quantityUnitCostMinor !== undefined
          ? { unitCostMinor: dto.quantityUnitCostMinor }
          : {}),
        ...(dto.batchLotReference !== undefined
          ? { batchLotReference: dto.batchLotReference.trim() || null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
      },
    );
    if (!updated) throw new NotFoundException('Stock receipt not found');
    return this.enrichReceipt(organizationId, updated);
  }

  async updateStatus(
    organizationId: string,
    receiptId: string,
    dto: UpdateStockReceiptStatusDto,
    actorUserId: string,
  ) {
    const existing = await this.repo.getStockReceiptInOrg(
      organizationId,
      receiptId,
    );
    if (!existing) throw new NotFoundException('Stock receipt not found');
    if (existing.isActive === dto.isActive) {
      throw new BadRequestException(
        dto.isActive
          ? 'Stock receipt is already active'
          : 'Stock receipt is already inactive',
      );
    }
    if (!dto.isActive && !dto.reason?.trim()) {
      throw new BadRequestException('Reason is required to deactivate');
    }
    const updated = await this.repo.updateStockReceipt(
      organizationId,
      receiptId,
      {
        isActive: dto.isActive,
        deactivateReason: dto.isActive ? null : (dto.reason?.trim() ?? null),
      },
    );
    if (!updated) throw new NotFoundException('Stock receipt not found');

    await this.audit.log({
      organizationId,
      userId: actorUserId,
      action: dto.isActive
        ? 'inventory.stock_receipt.activate'
        : 'inventory.stock_receipt.deactivate',
      resourceType: 'inventory_stock_receipt',
      resourceId: receiptId,
      metadata: dto.reason ? { reason: dto.reason.trim() } : undefined,
    });

    return this.enrichReceipt(organizationId, updated);
  }
}
