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
import { resolveListSort } from '../../common/utils/list-sort.util';
import type { ClientListSortField } from '../organisation/constants/organisation-list-sort.constants';
import {
  CLIENT_STATEMENT_LIST_DEFAULT_SORT,
  CLIENT_STATEMENT_LIST_SORT_FIELDS,
} from './constants/finance-list-sort.constants';
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

    const sort = resolveListSort(
      CLIENT_STATEMENT_LIST_SORT_FIELDS,
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      CLIENT_STATEMENT_LIST_DEFAULT_SORT,
    );
    const clientSortBy: ClientListSortField =
      sort.sortBy === 'clientName' ? 'name' : 'createdAt';
    const { rows: clients, total } =
      await this.organisationRepo.listOrganisationClients(
        organizationId,
        page,
        pageSize,
        {
          search: query.search,
          sort: { sortBy: clientSortBy, sortOrder: sort.sortOrder },
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

    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const [invoicePage, aggregates, billableInvoiceCount] = await Promise.all([
      this.financeRepo.listBillingInvoicesForClientInPeriod(
        organizationId,
        clientId,
        periodStart,
        periodEnd,
        { page, pageSize },
      ),
      this.financeRepo.aggregateBillingByClientIdsInPeriod(
        organizationId,
        [clientId],
        periodStart,
        periodEnd,
      ),
      this.financeRepo.countNonCancelledBillingInvoicesForClientInPeriod(
        organizationId,
        clientId,
        periodStart,
        periodEnd,
      ),
    ]);

    const agg = aggregates.get(clientId);
    const summary = {
      totalBilledMinor: agg?.totalBilledMinor ?? 0,
      totalPaidMinor: agg?.totalPaidMinor ?? 0,
      balanceDueMinor: agg?.balanceDueMinor ?? 0,
    };

    const invoiceItems = invoicePage.rows.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      description: inv.description,
      amountMinor: inv.totalAmountMinor,
      status: inv.status,
      excludedFromSummaryTotals: inv.status === 'cancelled',
    }));

    const invoicePagination = toPaginatedResult(
      invoiceItems,
      page,
      pageSize,
      invoicePage.total,
    );

    return {
      clientId: client.id,
      clientName: client.name,
      isActive: client.isActive,
      periodStart,
      periodEnd,
      billingInvoiceCount: invoicePage.total,
      billableInvoiceCount,
      summary,
      invoices: invoiceItems,
      invoicePage: invoicePagination.page,
      invoicePageSize: invoicePagination.pageSize,
      invoiceTotal: invoicePagination.total,
      invoiceTotalPages: invoicePagination.totalPages,
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
