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
import { OrganisationRepository } from '../organisation/repositories/organisation.repository';
import type {
  ClientStatementDetailQueryDto,
  ListClientStatementsQueryDto,
} from './dto/list-client-statements-query.dto';
import type { SendClientStatementDto } from './dto/send-client-statement.dto';
import { FinanceRepository } from './repositories/finance.repository';

function normalizePeriodDate(value: string): string {
  return value.slice(0, 10);
}

function assertValidPeriod(periodStart: string, periodEnd: string): void {
  const start = normalizePeriodDate(periodStart);
  const end = normalizePeriodDate(periodEnd);
  if (start > end) {
    throw new BadRequestException('periodStart must be on or before periodEnd');
  }
}

function summarizeInvoices(
  invoices: Array<{
    status: string;
    totalAmountMinor: number;
    amountPaidMinor: number;
  }>,
) {
  let totalBilledMinor = 0;
  let totalPaidMinor = 0;
  for (const inv of invoices) {
    if (inv.status === 'cancelled') continue;
    totalBilledMinor += inv.totalAmountMinor;
    totalPaidMinor += inv.amountPaidMinor;
  }
  const balanceDueMinor = Math.max(0, totalBilledMinor - totalPaidMinor);
  return { totalBilledMinor, totalPaidMinor, balanceDueMinor };
}

@Injectable()
export class ClientStatementsService {
  constructor(
    private readonly financeRepo: FinanceRepository,
    private readonly organisationRepo: OrganisationRepository,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListClientStatementsQueryDto) {
    const organizationId = query.organizationId;
    const periodStart = normalizePeriodDate(query.periodStart);
    const periodEnd = normalizePeriodDate(query.periodEnd);
    assertValidPeriod(periodStart, periodEnd);

    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const hasAnyBillingInvoicesEver =
      await this.financeRepo.hasAnyBillingInvoiceEver(organizationId);

    const { rows: clients, total } =
      await this.organisationRepo.listOrganisationClients(
        organizationId,
        page,
        pageSize,
        {
          search: query.search,
          orderBy: 'name',
        },
      );

    const clientIds = clients.map((c) => c.id);
    const aggregates =
      await this.financeRepo.aggregateBillingByClientIdsInPeriod(
        organizationId,
        clientIds,
        periodStart,
        periodEnd,
      );

    const items = clients.map((client) => {
      const agg = aggregates.get(client.id);
      const invoiceCount = agg?.invoiceCount ?? 0;
      const totalBilledMinor = agg?.totalBilledMinor ?? 0;
      const totalPaidMinor = agg?.totalPaidMinor ?? 0;
      const balanceDueMinor = agg?.balanceDueMinor ?? 0;
      return {
        clientId: client.id,
        clientName: client.name,
        isActive: client.isActive,
        invoiceCount,
        totalBilledMinor,
        totalPaidMinor,
        balanceDueMinor,
        hasBillingActivityInPeriod: invoiceCount > 0,
      };
    });

    return {
      hasAnyBillingInvoicesEver,
      periodStart,
      periodEnd,
      ...toPaginatedResult(items, page, pageSize, total),
    };
  }

  async getDetail(clientId: string, query: ClientStatementDetailQueryDto) {
    const organizationId = query.organizationId;
    const periodStart = normalizePeriodDate(query.periodStart);
    const periodEnd = normalizePeriodDate(query.periodEnd);
    assertValidPeriod(periodStart, periodEnd);

    const client = await this.organisationRepo.getOrganisationClientInOrg(
      organizationId,
      clientId,
    );
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const invoices =
      await this.financeRepo.listBillingInvoicesForClientInPeriod(
        organizationId,
        clientId,
        periodStart,
        periodEnd,
      );

    const summary = summarizeInvoices(invoices);
    const billableInvoiceCount =
      await this.financeRepo.countNonCancelledBillingInvoicesForClientInPeriod(
        organizationId,
        clientId,
        periodStart,
        periodEnd,
      );

    return {
      clientId: client.id,
      clientName: client.name,
      isActive: client.isActive,
      periodStart,
      periodEnd,
      billingInvoiceCount: invoices.length,
      billableInvoiceCount,
      summary,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        description: inv.description,
        amountMinor: inv.totalAmountMinor,
        status: inv.status,
        excludedFromSummaryTotals: inv.status === 'cancelled',
      })),
    };
  }

  async sendStatement(
    clientId: string,
    dto: SendClientStatementDto,
    userId: string | undefined,
  ) {
    const organizationId = dto.organizationId;
    const periodStart = normalizePeriodDate(dto.periodStart);
    const periodEnd = normalizePeriodDate(dto.periodEnd);
    assertValidPeriod(periodStart, periodEnd);

    const client = await this.organisationRepo.getOrganisationClientInOrg(
      organizationId,
      clientId,
    );
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const billableCount =
      await this.financeRepo.countNonCancelledBillingInvoicesForClientInPeriod(
        organizationId,
        clientId,
        periodStart,
        periodEnd,
      );
    if (billableCount === 0) {
      throw new BadRequestException(
        'No billable billing invoices in the selected period for this client',
      );
    }

    await this.audit.log({
      organizationId,
      userId,
      action: 'finance.client_statement.send',
      resourceType: 'organisation_client',
      resourceId: clientId,
      metadata: {
        clientName: client.name,
        periodStart,
        periodEnd,
        billableInvoiceCount: billableCount,
        emailDispatch: 'deferred',
        note: 'Outbound mail not wired; statement send recorded for audit only',
      },
    });

    return {
      clientId,
      periodStart,
      periodEnd,
      recorded: true,
      emailDispatch: 'deferred' as const,
    };
  }
}
