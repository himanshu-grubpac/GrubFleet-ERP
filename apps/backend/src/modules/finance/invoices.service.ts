import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { DRIZZLE } from '../../database/drizzle.tokens';
import type { AppDatabase } from '../../database/database.module';
import { AuditService } from '../audit/audit.service';
import { AssetRegisterCatalogService } from '../asset-register/asset-register-catalog.service';
import { AssetRegisterVehiclesService } from '../asset-register/asset-register-vehicles.service';
import { FleetClientsService } from '../fleet-leasing/fleet-clients.service';
import { FleetLeasingRepository } from '../fleet-leasing/repositories/fleet-leasing.repository';
import { ClientsService } from '../organisation/clients.service';
import {
  FINANCE_BILLABLE_LEASE_STATUSES,
  type FinanceInvoiceStatus,
  type FinanceInvoiceType,
} from './constants/invoice.constants';
import {
  FINANCE_INVOICE_PAYMENT_METHOD_LABELS,
  FINANCE_INVOICE_PAYMENT_METHODS,
} from './constants/payment-method.constants';
import type { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import type { CreateBillingInvoiceDto } from './dto/create-billing-invoice.dto';
import type { CreatePurchaseSparePartsInvoiceDto } from './dto/create-purchase-spare-parts-invoice.dto';
import type { CreatePurchaseVehicleInvoiceDto } from './dto/create-purchase-vehicle-invoice.dto';
import type { CreateSaleInvoiceDto } from './dto/create-sale-invoice.dto';
import type { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import type { RecordInvoicePaymentDto } from './dto/record-invoice-payment.dto';
import type { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { FinanceRepository } from './repositories/finance.repository';

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly repo: FinanceRepository,
    private readonly audit: AuditService,
    private readonly assetCatalog: AssetRegisterCatalogService,
    private readonly assetVehicles: AssetRegisterVehiclesService,
    @Inject(forwardRef(() => ClientsService))
    private readonly clients: ClientsService,
    private readonly fleetClients: FleetClientsService,
    private readonly fleetLeasingRepo: FleetLeasingRepository,
  ) {}

  async list(query: ListInvoicesQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } = await this.repo.listInvoices(
      query.organizationId,
      page,
      pageSize,
      {
        search: query.search,
        status: query.status,
        invoiceType: query.invoiceType,
      },
    );
    const items = rows.map((row) => this.toListItem(row));
    return toPaginatedResult(items, page, pageSize, total);
  }

  listPaymentMethods() {
    return FINANCE_INVOICE_PAYMENT_METHODS.map((value) => ({
      value,
      label: FINANCE_INVOICE_PAYMENT_METHOD_LABELS[value],
    }));
  }

  async getById(organizationId: string, invoiceId: string) {
    const detail = await this.repo.getInvoiceInOrg(organizationId, invoiceId);
    if (!detail) throw new NotFoundException('Invoice not found');
    const partIds = detail.lines
      .map((l) => l.inventoryPartId)
      .filter((id): id is string => !!id);
    const partNames = await this.repo.getPartNamesByIds(partIds);
    const payments = await this.repo.listPaymentsForInvoice(invoiceId);
    const inv = detail.invoice;
    const amountPaidMinor = inv.amountPaidMinor ?? 0;
    const balanceDueMinor = Math.max(0, inv.totalAmountMinor - amountPaidMinor);

    const vehicleLine = detail.lines.find((l) => l.vehicleId);
    let vehicleLabel: string | null = null;
    if (vehicleLine?.vehicleId) {
      try {
        const vehicle = await this.assetVehicles.getById(
          organizationId,
          vehicleLine.vehicleId,
        );
        vehicleLabel = `${vehicle.fleetCode} — ${vehicle.assetClassName} (${vehicle.operationalStatus})`;
      } catch {
        vehicleLabel = null;
      }
    }

    let leaseContractNumber: string | null = null;
    if (inv.leaseContractId) {
      const contract = await this.fleetLeasingRepo.findContractInOrg(
        organizationId,
        inv.leaseContractId,
      );
      leaseContractNumber = contract?.contractNumber ?? null;
    }

    return {
      ...this.toListItem(inv),
      notes: inv.notes,
      supplierId: inv.supplierId,
      purchaseLineKind: inv.purchaseLineKind,
      partyEmail: inv.partyEmail,
      clientId: inv.clientId,
      leaseContractId: inv.leaseContractId,
      leaseContractNumber,
      billingPeriod: inv.billingPeriod,
      cancelReason: inv.cancelReason,
      amountPaidMinor,
      balanceDueMinor,
      vehicleId: vehicleLine?.vehicleId ?? null,
      vehicleLabel,
      payments: payments.map((p) => ({
        id: p.id,
        paymentNumber: p.paymentNumber ?? null,
        amountMinor: p.amountMinor,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        paymentReference: p.paymentReference ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
      paymentSummary: this.buildPaymentSummary(
        inv.invoiceType,
        inv.totalAmountMinor,
        amountPaidMinor,
        balanceDueMinor,
      ),
      referencedBy: this.buildReferencedBy(
        inv.invoiceType,
        inv.status,
        detail.lines,
        vehicleLabel,
      ),
      lines: detail.lines.map((line) => ({
        id: line.id,
        lineKind: line.lineKind,
        assetClassName: line.assetClassName,
        inventoryPartId: line.inventoryPartId,
        inventoryPartName: line.inventoryPartId
          ? (partNames.get(line.inventoryPartId) ?? null)
          : null,
        vehicleId: line.vehicleId,
        quantity: line.quantity,
        unitCostMinor: line.unitCostMinor,
        lineAmountMinor: line.lineAmountMinor,
        batchLot: line.batchLot,
      })),
      availableActions: this.buildAvailableActions(
        inv.invoiceType,
        inv.status,
        amountPaidMinor,
        balanceDueMinor,
      ),
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    };
  }

  async createPurchaseVehicle(
    dto: CreatePurchaseVehicleInvoiceDto,
    userId: string | undefined,
  ) {
    const supplier = await this.repo.getSupplierInOrg(
      dto.organizationId,
      dto.supplierId,
    );
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (!supplier.isActive) {
      throw new BadRequestException(
        'Inactive supplier cannot be used on a new invoice',
      );
    }

    const classNames =
      await this.assetCatalog.listDistinctActiveAssetClassNames(
        dto.organizationId,
      );
    const assetClass = dto.assetClassName.trim();
    if (!classNames.includes(assetClass)) {
      throw new BadRequestException(
        'Asset class must be an active asset register class name',
      );
    }

    const invoiceDate = dto.invoiceDate.slice(0, 10);
    const year = Number(invoiceDate.slice(0, 4));
    if (!Number.isFinite(year)) {
      throw new BadRequestException('Invalid invoice date');
    }

    const description = `Vehicle purchase — ${assetClass}`;

    const created = await this.db.transaction(async (tx) => {
      const invoiceNumber = await this.repo.allocatePurchaseInvoiceNumber(
        tx,
        dto.organizationId,
        year,
      );
      return this.repo.insertInvoiceWithLine(
        tx,
        {
          organizationId: dto.organizationId,
          invoiceNumber,
          invoiceType: 'purchase',
          status: 'unpaid',
          supplierId: dto.supplierId,
          partyName: supplier.name,
          description,
          totalAmountMinor: dto.totalAmountMinor,
          invoiceDate,
          notes: dto.notes?.trim() || null,
          purchaseLineKind: 'vehicle',
        },
        {
          invoiceId: '',
          lineKind: 'vehicle',
          assetClassName: assetClass,
          quantity: 1,
          lineAmountMinor: dto.totalAmountMinor,
        },
      );
    });

    await this.audit.log({
      organizationId: dto.organizationId,
      userId,
      action: 'finance.invoice.create',
      resourceType: 'finance_invoice',
      resourceId: created.id,
      metadata: {
        invoiceNumber: created.invoiceNumber,
        invoiceType: 'purchase',
        purchaseLineKind: 'vehicle',
      },
    });

    return this.getById(dto.organizationId, created.id);
  }

  async createPurchaseSpareParts(
    dto: CreatePurchaseSparePartsInvoiceDto,
    userId: string | undefined,
  ) {
    const supplier = await this.repo.getSupplierInOrg(
      dto.organizationId,
      dto.supplierId,
    );
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (!supplier.isActive) {
      throw new BadRequestException(
        'Inactive supplier cannot be used on a new invoice',
      );
    }

    const part = await this.repo.getPartInOrg(
      dto.organizationId,
      dto.inventoryPartId,
    );
    if (!part) throw new NotFoundException('Inventory part not found');

    const lineTotal = dto.unitCostMinor * dto.quantity;
    if (!Number.isSafeInteger(lineTotal) || lineTotal < 1) {
      throw new BadRequestException('Invalid line amount');
    }

    const invoiceDate = dto.invoiceDate.slice(0, 10);
    const year = Number(invoiceDate.slice(0, 4));

    const description = `Spare parts — ${part.name}`;

    const created = await this.db.transaction(async (tx) => {
      const invoiceNumber = await this.repo.allocatePurchaseInvoiceNumber(
        tx,
        dto.organizationId,
        year,
      );
      return this.repo.insertInvoiceWithLine(
        tx,
        {
          organizationId: dto.organizationId,
          invoiceNumber,
          invoiceType: 'purchase',
          status: 'unpaid',
          supplierId: dto.supplierId,
          partyName: supplier.name,
          description,
          totalAmountMinor: lineTotal,
          invoiceDate,
          notes: dto.notes?.trim() || null,
          purchaseLineKind: 'spare_parts',
        },
        {
          invoiceId: '',
          lineKind: 'spare_parts',
          inventoryPartId: dto.inventoryPartId,
          quantity: dto.quantity,
          unitCostMinor: dto.unitCostMinor,
          lineAmountMinor: lineTotal,
          batchLot: dto.batchLot?.trim() || null,
        },
      );
    });

    await this.audit.log({
      organizationId: dto.organizationId,
      userId,
      action: 'finance.invoice.create',
      resourceType: 'finance_invoice',
      resourceId: created.id,
      metadata: {
        invoiceNumber: created.invoiceNumber,
        invoiceType: 'purchase',
        purchaseLineKind: 'spare_parts',
      },
    });

    return this.getById(dto.organizationId, created.id);
  }

  async createSale(dto: CreateSaleInvoiceDto, userId: string | undefined) {
    const vehicle = await this.assetVehicles.getById(
      dto.organizationId,
      dto.vehicleId,
    );
    if (!vehicle.isActive) {
      throw new BadRequestException(
        'Inactive fleet register vehicle cannot be sold',
      );
    }
    if (vehicle.operationalStatus !== 'available') {
      throw new BadRequestException(
        'Only available fleet register vehicles can be sold on a sale invoice',
      );
    }

    const buyerName = dto.buyerName.trim();
    const invoiceDate = dto.invoiceDate.slice(0, 10);
    const year = Number(invoiceDate.slice(0, 4));
    const description = `Vehicle sale — ${vehicle.fleetCode}`;
    const requestAutoEmail = dto.requestAutoEmail === true;

    const created = await this.db.transaction(async (tx) => {
      const invoiceNumber = await this.repo.allocateInvoiceNumber(
        tx,
        dto.organizationId,
        year,
        'sale',
      );
      return this.repo.insertInvoiceWithLine(
        tx,
        {
          organizationId: dto.organizationId,
          invoiceNumber,
          invoiceType: 'sale',
          status: 'unpaid',
          supplierId: null,
          partyName: buyerName,
          partyEmail: dto.buyerEmail?.trim().toLowerCase() || null,
          description,
          totalAmountMinor: dto.totalAmountMinor,
          amountPaidMinor: 0,
          invoiceDate,
          notes: dto.notes?.trim() || null,
          purchaseLineKind: null,
          saleAutoEmailRequested: requestAutoEmail,
        },
        {
          invoiceId: '',
          lineKind: 'sale_vehicle',
          vehicleId: dto.vehicleId,
          quantity: 1,
          lineAmountMinor: dto.totalAmountMinor,
        },
      );
    });

    await this.audit.log({
      organizationId: dto.organizationId,
      userId,
      action: 'finance.invoice.create',
      resourceType: 'finance_invoice',
      resourceId: created.id,
      metadata: {
        invoiceNumber: created.invoiceNumber,
        invoiceType: 'sale',
        saleAutoEmailRequested: requestAutoEmail,
        ...(requestAutoEmail
          ? { emailDispatch: 'deferred', note: 'Outbound mail not wired' }
          : {}),
      },
    });

    return this.getById(dto.organizationId, created.id);
  }

  async createBilling(
    dto: CreateBillingInvoiceDto,
    userId: string | undefined,
  ) {
    let clientDetail: Awaited<ReturnType<ClientsService['getById']>>;
    try {
      clientDetail = await this.clients.getById(
        dto.organizationId,
        dto.clientId,
      );
    } catch {
      throw new NotFoundException('Client not found');
    }
    if (!clientDetail.isActive) {
      throw new BadRequestException(
        'Inactive client cannot be used on a billing invoice',
      );
    }

    const fleetClientId = await this.fleetClients.getLinkedFleetClientId(
      dto.organizationId,
      dto.clientId,
    );
    if (!fleetClientId) {
      throw new BadRequestException(
        'Client has no linked fleet leasing profile; link client before billing',
      );
    }

    const contract = await this.fleetLeasingRepo.findContractInOrg(
      dto.organizationId,
      dto.leaseContractId,
    );
    if (!contract) throw new NotFoundException('Lease contract not found');
    if (contract.clientId !== fleetClientId) {
      throw new BadRequestException(
        'Lease contract does not belong to the selected client',
      );
    }
    if (
      !FINANCE_BILLABLE_LEASE_STATUSES.includes(
        contract.status as (typeof FINANCE_BILLABLE_LEASE_STATUSES)[number],
      )
    ) {
      throw new BadRequestException(
        'Lease contract is not in a billable status for this invoice',
      );
    }

    const billingPeriod = dto.billingPeriod.trim();
    const invoiceDate = dto.invoiceDate.slice(0, 10);
    const year = Number(invoiceDate.slice(0, 4));
    const description = `Lease billing — ${contract.contractNumber} (${billingPeriod})`;

    const created = await this.db.transaction(async (tx) => {
      const invoiceNumber = await this.repo.allocateInvoiceNumber(
        tx,
        dto.organizationId,
        year,
        'billing',
      );
      return this.repo.insertInvoiceWithLine(
        tx,
        {
          organizationId: dto.organizationId,
          invoiceNumber,
          invoiceType: 'billing',
          status: 'unpaid',
          supplierId: null,
          partyName: clientDetail.clientName,
          description,
          totalAmountMinor: dto.totalAmountMinor,
          amountPaidMinor: 0,
          invoiceDate,
          notes: dto.notes?.trim() || null,
          purchaseLineKind: null,
          clientId: dto.clientId,
          leaseContractId: dto.leaseContractId,
          billingPeriod,
        },
        {
          invoiceId: '',
          lineKind: 'billing_lease',
          quantity: 1,
          lineAmountMinor: dto.totalAmountMinor,
        },
      );
    });

    await this.audit.log({
      organizationId: dto.organizationId,
      userId,
      action: 'finance.invoice.create',
      resourceType: 'finance_invoice',
      resourceId: created.id,
      metadata: {
        invoiceNumber: created.invoiceNumber,
        invoiceType: 'billing',
        leaseContractId: dto.leaseContractId,
      },
    });

    return this.getById(dto.organizationId, created.id);
  }

  async updateUnpaid(
    organizationId: string,
    invoiceId: string,
    dto: UpdateInvoiceDto,
    userId: string | undefined,
  ) {
    const existing = await this.repo.getInvoiceInOrg(organizationId, invoiceId);
    if (!existing) throw new NotFoundException('Invoice not found');
    if (existing.invoice.status !== 'unpaid') {
      throw new BadRequestException('Only unpaid invoices can be edited');
    }

    const patch: Parameters<FinanceRepository['updateUnpaidInvoice']>[2] = {};
    if (dto.partyName !== undefined) patch.partyName = dto.partyName.trim();
    if (dto.partyEmail !== undefined) {
      patch.partyEmail = dto.partyEmail.trim().toLowerCase() || null;
    }
    if (dto.invoiceDate !== undefined) {
      patch.invoiceDate = dto.invoiceDate.slice(0, 10);
    }
    if (dto.notes !== undefined) patch.notes = dto.notes.trim() || null;
    if (dto.billingPeriod !== undefined) {
      patch.billingPeriod = dto.billingPeriod.trim();
    }
    if (dto.totalAmountMinor !== undefined) {
      patch.totalAmountMinor = dto.totalAmountMinor;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const updated = await this.db.transaction(async (tx) => {
      const row = await this.repo.updateUnpaidInvoice(
        organizationId,
        invoiceId,
        patch,
        tx,
      );
      if (!row) {
        throw new BadRequestException('Invoice could not be updated');
      }
      if (patch.totalAmountMinor != null) {
        await this.repo.updateInvoiceLineAmount(
          tx,
          invoiceId,
          patch.totalAmountMinor,
        );
      }
      return row;
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'finance.invoice.update',
      resourceType: 'finance_invoice',
      resourceId: invoiceId,
      metadata: { invoiceNumber: updated.invoiceNumber },
    });

    return this.getById(organizationId, invoiceId);
  }

  async recordPayment(
    organizationId: string,
    invoiceId: string,
    dto: RecordInvoicePaymentDto,
    userId: string | undefined,
  ) {
    const existing = await this.repo.getInvoiceInOrg(organizationId, invoiceId);
    if (!existing) throw new NotFoundException('Invoice not found');
    const inv = existing.invoice;
    if (inv.invoiceType === 'purchase') {
      throw new BadRequestException(
        'Purchase invoice payments are recorded via Vendor Payments, not on this invoice',
      );
    }
    if (inv.status === 'cancelled') {
      throw new BadRequestException(
        'Cancelled invoices cannot accept payments',
      );
    }
    if (inv.status === 'paid') {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const paid = inv.amountPaidMinor ?? 0;
    const balance = inv.totalAmountMinor - paid;
    if (dto.amountMinor > balance) {
      throw new BadRequestException(
        'Payment amount exceeds balance due on this invoice',
      );
    }

    const paymentDate = dto.paymentDate.slice(0, 10);
    const newPaid = paid + dto.amountMinor;
    const newStatus: FinanceInvoiceStatus =
      newPaid >= inv.totalAmountMinor
        ? 'paid'
        : newPaid > 0
          ? 'partially_paid'
          : 'unpaid';

    await this.db.transaction(async (tx) => {
      await this.repo.insertPaymentRow(tx, {
        invoiceId,
        organizationId,
        amountMinor: dto.amountMinor,
        paymentDate,
        paymentMethod: dto.paymentMethod?.trim() || null,
        paymentReference: dto.paymentReference?.trim() || null,
      });
      const updated = await this.repo.applyPaymentTotals(
        tx,
        organizationId,
        invoiceId,
        newPaid,
        newStatus,
      );
      if (!updated) {
        throw new BadRequestException('Payment could not be applied');
      }
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'finance.invoice.payment',
      resourceType: 'finance_invoice',
      resourceId: invoiceId,
      metadata: {
        amountMinor: dto.amountMinor,
        newStatus,
      },
    });

    return this.getById(organizationId, invoiceId);
  }

  async cancel(
    organizationId: string,
    invoiceId: string,
    userId: string | undefined,
    dto?: CancelInvoiceDto,
  ) {
    const existing = await this.repo.getInvoiceInOrg(organizationId, invoiceId);
    if (!existing) throw new NotFoundException('Invoice not found');
    if (existing.invoice.status === 'cancelled') {
      throw new BadRequestException('Invoice is already cancelled');
    }
    /**
     * Product rule: cancel allowed for unpaid and partially_paid (Figma billing/sale footers).
     * Fully paid invoices cannot be cancelled — use credit/adjustment flow when product defines it.
     */
    if (existing.invoice.status === 'paid') {
      throw new BadRequestException('Paid invoices cannot be cancelled');
    }
    if (existing.invoice.invoiceType === 'purchase') {
      throw new BadRequestException(
        'Purchase invoices are removed when unpaid; use DELETE to remove from the register',
      );
    }

    const updated = await this.repo.cancelInvoice(
      organizationId,
      invoiceId,
      dto?.reason,
    );
    if (!updated)
      throw new BadRequestException('Invoice could not be cancelled');

    await this.audit.log({
      organizationId,
      userId,
      action: 'finance.invoice.cancel',
      resourceType: 'finance_invoice',
      resourceId: invoiceId,
      metadata: {
        invoiceNumber: updated.invoiceNumber,
        reason: dto?.reason?.trim() || null,
      },
    });

    return this.getById(organizationId, invoiceId);
  }

  async removeUnpaidPurchase(
    organizationId: string,
    invoiceId: string,
    userId: string | undefined,
  ) {
    const existing = await this.repo.getInvoiceInOrg(organizationId, invoiceId);
    if (!existing) throw new NotFoundException('Invoice not found');
    const inv = existing.invoice;
    if (inv.invoiceType !== 'purchase') {
      throw new BadRequestException(
        'Only unpaid purchase invoices can be removed from the register',
      );
    }
    if (inv.status !== 'unpaid') {
      throw new BadRequestException(
        'Only unpaid purchase invoices can be removed',
      );
    }
    const paid = inv.amountPaidMinor ?? 0;
    if (paid > 0) {
      throw new BadRequestException(
        'Purchase invoices with recorded vendor payments cannot be removed',
      );
    }

    const deleted = await this.repo.deleteInvoiceHard(
      organizationId,
      invoiceId,
    );
    if (!deleted) {
      throw new BadRequestException('Invoice could not be removed');
    }

    await this.audit.log({
      organizationId,
      userId,
      action: 'finance.invoice.remove',
      resourceType: 'finance_invoice',
      resourceId: invoiceId,
      metadata: {
        invoiceNumber: deleted.invoiceNumber,
        invoiceType: 'purchase',
      },
    });

    return {
      id: deleted.id,
      invoiceNumber: deleted.invoiceNumber,
      removed: true as const,
    };
  }

  private buildPaymentSummary(
    invoiceType: FinanceInvoiceType,
    totalAmountMinor: number,
    amountPaidMinor: number,
    balanceDueMinor: number,
  ) {
    const isPurchase = invoiceType === 'purchase';
    return {
      totalAmountMinor,
      amountPaidMinor,
      balanceDueMinor,
      readOnly: isPurchase,
      readOnlyMessage: isPurchase
        ? 'Payments are recorded from Vendor Payments, not on this screen.'
        : null,
    };
  }

  private buildReferencedBy(
    invoiceType: FinanceInvoiceType,
    status: FinanceInvoiceStatus,
    lines: Array<{
      lineKind: string;
      vehicleId: string | null;
      batchLot: string | null;
      inventoryPartId: string | null;
    }>,
    vehicleLabel: string | null,
  ) {
    const links: Array<{
      kind: 'fleet_vehicle' | 'stock_receipt';
      label: string;
      entityId: string | null;
    }> = [];

    const vehicleLine = lines.find((l) => l.vehicleId);
    if (vehicleLine?.vehicleId && vehicleLabel) {
      links.push({
        kind: 'fleet_vehicle',
        label: vehicleLabel,
        entityId: vehicleLine.vehicleId,
      });
    }

    if (invoiceType === 'purchase') {
      const partsLine = lines.find(
        (l) => l.lineKind === 'spare_parts' && l.batchLot?.trim(),
      );
      if (
        partsLine?.batchLot &&
        (status === 'paid' || status === 'partially_paid')
      ) {
        links.push({
          kind: 'stock_receipt',
          label: `Stock receipt — Lot ${partsLine.batchLot.trim()}`,
          entityId: null,
        });
      }
    }

    return links;
  }

  private buildAvailableActions(
    invoiceType: FinanceInvoiceType,
    status: FinanceInvoiceStatus,
    amountPaidMinor: number,
    balanceDueMinor: number,
  ) {
    const isCancelled = status === 'cancelled';
    const isPaid = status === 'paid';
    const isPurchase = invoiceType === 'purchase';
    const unpaidPurchaseRemovable =
      isPurchase && status === 'unpaid' && amountPaidMinor === 0;

    return {
      edit: status === 'unpaid' && !isCancelled,
      cancel: !isPurchase && !isCancelled && !isPaid,
      remove: unpaidPurchaseRemovable,
      recordPayment:
        !isPurchase && !isCancelled && balanceDueMinor > 0 && !isPaid,
    };
  }

  private toListItem(row: {
    id: string;
    invoiceNumber: string;
    invoiceType: string;
    status: string;
    partyName: string;
    description: string;
    totalAmountMinor: number;
    amountPaidMinor?: number;
    invoiceDate: string;
  }) {
    const amountPaidMinor = row.amountPaidMinor ?? 0;
    const balanceDueMinor = Math.max(0, row.totalAmountMinor - amountPaidMinor);
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      invoiceType: row.invoiceType,
      status: row.status,
      partyName: row.partyName,
      description: row.description,
      totalAmountMinor: row.totalAmountMinor,
      amountPaidMinor,
      balanceDueMinor,
      invoiceDate: row.invoiceDate,
      availableActions: this.buildAvailableActions(
        row.invoiceType as FinanceInvoiceType,
        row.status as FinanceInvoiceStatus,
        amountPaidMinor,
        balanceDueMinor,
      ),
    };
  }
}
