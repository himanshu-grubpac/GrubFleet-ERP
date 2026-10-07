import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { AppDatabase } from '../../database/database.module';
import { DRIZZLE } from '../../database/drizzle.tokens';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import type { FinanceInvoiceStatus } from './constants/invoice.constants';
import { FINANCE_INVOICE_PAYMENT_METHOD_LABELS } from './constants/payment-method.constants';
import type { CreateVendorPaymentDto } from './dto/create-vendor-payment.dto';
import type { ListVendorPaymentsQueryDto } from './dto/list-vendor-payments-query.dto';
import type { ListVendorPaymentPurchaseInvoicesQueryDto } from './dto/list-vendor-payments-query.dto';
import { FinanceRepository } from './repositories/finance.repository';

@Injectable()
export class VendorPaymentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly repo: FinanceRepository,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListVendorPaymentsQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } = await this.repo.listVendorPayments(
      query.organizationId,
      page,
      pageSize,
      query.search,
    );

    const invoiceIds = [...new Set(rows.map((r) => r.invoiceId))];
    const latestByInvoice =
      await this.repo.getLatestPaymentIdsForInvoices(invoiceIds);

    const items = rows.map((row) =>
      this.toListItem(
        row.payment,
        row.invoiceNumber,
        row.invoiceId,
        row.vendorName,
        latestByInvoice.get(row.invoiceId) === row.payment.id,
      ),
    );

    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, paymentId: string) {
    const row = await this.repo.getVendorPaymentInOrg(
      organizationId,
      paymentId,
    );
    if (!row) throw new NotFoundException('Vendor payment not found');

    const inv = row.invoice;
    const amountPaidMinor = inv.amountPaidMinor ?? 0;
    const balanceDueMinor = Math.max(0, inv.totalAmountMinor - amountPaidMinor);
    const latestId = await this.repo.getLatestPaymentIdForInvoice(inv.id);

    return {
      ...this.toListItem(
        row.payment,
        inv.invoiceNumber,
        inv.id,
        inv.partyName,
        latestId === row.payment.id,
      ),
      purchaseInvoice: {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        vendorName: inv.partyName,
        totalAmountMinor: inv.totalAmountMinor,
        amountPaidMinor,
        balanceDueMinor,
        status: inv.status,
      },
      createdAt: row.payment.createdAt.toISOString(),
    };
  }

  async listPurchaseInvoiceCatalog(
    query: ListVendorPaymentPurchaseInvoicesQueryDto,
  ) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = Math.min(query.pageSize ?? 50, 50);
    const { rows, total } = await this.repo.listPurchaseInvoicesWithBalanceDue(
      query.organizationId,
      page,
      pageSize,
      query.search,
    );

    const items = rows.map((inv) => {
      const amountPaidMinor = inv.amountPaidMinor ?? 0;
      const balanceDueMinor = Math.max(
        0,
        inv.totalAmountMinor - amountPaidMinor,
      );
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        vendorName: inv.partyName,
        invoiceDate: inv.invoiceDate,
        status: inv.status,
        totalAmountMinor: inv.totalAmountMinor,
        amountPaidMinor,
        balanceDueMinor,
      };
    });

    return toPaginatedResult(items, page, pageSize, total);
  }

  async record(dto: CreateVendorPaymentDto, userId: string | undefined) {
    const existing = await this.repo.getInvoiceInOrg(
      dto.organizationId,
      dto.purchaseInvoiceId,
    );
    if (!existing) throw new NotFoundException('Purchase invoice not found');
    const inv = existing.invoice;
    if (inv.invoiceType !== 'purchase') {
      throw new BadRequestException(
        'Vendor payments apply to purchase invoices only',
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
    const year = Number.parseInt(paymentDate.slice(0, 4), 10);
    if (!Number.isFinite(year)) {
      throw new BadRequestException('Invalid payment date');
    }

    const newPaid = paid + dto.amountMinor;
    const newStatus: FinanceInvoiceStatus =
      newPaid >= inv.totalAmountMinor
        ? 'paid'
        : newPaid > 0
          ? 'partially_paid'
          : 'unpaid';

    let paymentNumber = '';
    let paymentId = '';

    await this.db.transaction(async (tx) => {
      paymentNumber = await this.repo.allocateVendorPaymentNumber(
        tx,
        dto.organizationId,
        year,
      );
      const created = await this.repo.insertPaymentRow(tx, {
        invoiceId: dto.purchaseInvoiceId,
        organizationId: dto.organizationId,
        amountMinor: dto.amountMinor,
        paymentDate,
        paymentMethod: dto.paymentMethod.trim(),
        paymentReference: dto.paymentReference?.trim() || null,
        paymentNumber,
      });
      paymentId = created.id;

      const updated = await this.repo.applyPaymentTotals(
        tx,
        dto.organizationId,
        dto.purchaseInvoiceId,
        newPaid,
        newStatus,
      );
      if (!updated) {
        throw new BadRequestException('Payment could not be applied');
      }
    });

    await this.audit.log({
      organizationId: dto.organizationId,
      userId,
      action: 'finance.vendor_payment.create',
      resourceType: 'finance_vendor_payment',
      resourceId: paymentId,
      metadata: {
        paymentNumber,
        purchaseInvoiceId: dto.purchaseInvoiceId,
        invoiceNumber: inv.invoiceNumber,
        amountMinor: dto.amountMinor,
        newStatus,
      },
    });

    return this.getById(dto.organizationId, paymentId);
  }

  async remove(
    organizationId: string,
    paymentId: string,
    userId: string | undefined,
  ) {
    const row = await this.repo.getVendorPaymentInOrg(
      organizationId,
      paymentId,
    );
    if (!row) throw new NotFoundException('Vendor payment not found');

    const latestId = await this.repo.getLatestPaymentIdForInvoice(
      row.invoice.id,
    );
    if (latestId !== paymentId) {
      throw new BadRequestException(
        'Only the most recent payment on an invoice can be removed',
      );
    }

    const inv = row.invoice;
    const paid = inv.amountPaidMinor ?? 0;
    const newPaid = Math.max(0, paid - row.payment.amountMinor);
    const newStatus: FinanceInvoiceStatus =
      newPaid >= inv.totalAmountMinor
        ? 'paid'
        : newPaid > 0
          ? 'partially_paid'
          : 'unpaid';

    await this.db.transaction(async (tx) => {
      const deleted = await this.repo.deletePaymentById(
        tx,
        organizationId,
        paymentId,
      );
      if (!deleted) {
        throw new BadRequestException('Payment could not be removed');
      }
      const updated = await this.repo.applyPaymentTotals(
        tx,
        organizationId,
        inv.id,
        newPaid,
        newStatus,
      );
      if (!updated) {
        throw new BadRequestException('Invoice totals could not be updated');
      }
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'finance.vendor_payment.remove',
      resourceType: 'finance_vendor_payment',
      resourceId: paymentId,
      metadata: {
        paymentNumber: row.payment.paymentNumber,
        purchaseInvoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amountMinor: row.payment.amountMinor,
        newStatus,
      },
    });

    return {
      id: paymentId,
      paymentNumber: row.payment.paymentNumber,
      removed: true as const,
    };
  }

  private toListItem(
    payment: {
      id: string;
      paymentNumber: string | null;
      amountMinor: number;
      paymentDate: string;
      paymentMethod: string | null;
      paymentReference: string | null;
    },
    invoiceNumber: string,
    purchaseInvoiceId: string,
    vendorName: string,
    canRemove: boolean,
  ) {
    const methodKey =
      payment.paymentMethod as keyof typeof FINANCE_INVOICE_PAYMENT_METHOD_LABELS;
    const paymentMethodLabel =
      payment.paymentMethod && FINANCE_INVOICE_PAYMENT_METHOD_LABELS[methodKey]
        ? FINANCE_INVOICE_PAYMENT_METHOD_LABELS[methodKey]
        : payment.paymentMethod;

    return {
      id: payment.id,
      paymentNumber: payment.paymentNumber ?? payment.id,
      paymentDate: payment.paymentDate,
      purchaseInvoiceId,
      purchaseInvoiceNumber: invoiceNumber,
      vendorName,
      amountMinor: payment.amountMinor,
      paymentMethod: payment.paymentMethod,
      paymentMethodLabel,
      paymentReference: payment.paymentReference ?? null,
      availableActions: {
        remove: canRemove,
      },
    };
  }
}
