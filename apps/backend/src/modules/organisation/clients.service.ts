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
import type { OrganisationClientPocDto } from './dto/client-poc.dto';
import type { CreateOrganisationClientDto } from './dto/create-client.dto';
import type { ListOrganisationClientsQueryDto } from './dto/list-clients-query.dto';
import type { UpdateOrganisationClientDto } from './dto/update-client.dto';
import type { UpdateOrganisationClientStatusDto } from './dto/update-client-status.dto';
import { OrganisationRepository } from './repositories/organisation.repository';
import type {
  OrganisationClientPocRow,
  OrganisationClientRow,
} from './repositories/organisation.repository';
import { formatLocationAddress } from './utils/format-location-address.util';
import {
  assertValidLocationCountry,
  assertValidLocationPostal,
} from './utils/validate-location-geo.util';

export type OrganisationClientContractHistoryItem = {
  id: string;
  assetClasses: string;
  startDate: string;
  status: string;
};

@Injectable()
export class ClientsService {
  constructor(
    private readonly repo: OrganisationRepository,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListOrganisationClientsQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const isActive =
      query.status === 'active'
        ? true
        : query.status === 'inactive'
          ? false
          : undefined;
    const { rows, total } = await this.repo.listOrganisationClients(
      query.organizationId,
      page,
      pageSize,
      {
        search: query.search,
        isActive,
      },
    );
    const primaryByClient =
      await this.repo.getPrimaryPocsForOrganisationClients(
        rows.map((row) => row.id),
      );
    const items = rows.map((row) =>
      this.toListItem(row, primaryByClient.get(row.id)),
    );
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, clientId: string) {
    const bundle = await this.repo.getOrganisationClientWithPocs(
      organizationId,
      clientId,
    );
    if (!bundle) throw new NotFoundException('Client not found');
    return this.toDetail(bundle.client, bundle.pocs);
  }

  async create(dto: CreateOrganisationClientDto) {
    this.assertPrimaryPocRules(dto.pointsOfContact);
    const addressCountry = assertValidLocationCountry(dto.addressCountry);
    assertValidLocationPostal(addressCountry, dto.addressPincode);
    const inserted = await this.repo.insertOrganisationClient({
      organizationId: dto.organizationId,
      name: dto.clientName.trim(),
      addressLine1: dto.addressLine1.trim(),
      addressLine2: dto.addressLine2?.trim() ?? null,
      addressCity: dto.addressCity?.trim() ?? null,
      addressCountry,
      addressState: dto.addressState.trim(),
      addressDistrict: dto.addressDistrict.trim(),
      addressPincode: dto.addressPincode.trim(),
      isActive: true,
    });
    await this.repo.replaceOrganisationClientPocs(
      inserted.id,
      dto.pointsOfContact.map((p, i) => this.toPocInsert(p, i)),
    );
    return this.getById(dto.organizationId, inserted.id);
  }

  async update(
    organizationId: string,
    clientId: string,
    dto: UpdateOrganisationClientDto,
  ) {
    const existing = await this.repo.getOrganisationClientInOrg(
      organizationId,
      clientId,
    );
    if (!existing) throw new NotFoundException('Client not found');
    if (!existing.isActive) {
      throw new BadRequestException(
        'Inactive clients cannot be edited until reactivated',
      );
    }
    if (dto.pointsOfContact) {
      this.assertPrimaryPocRules(dto.pointsOfContact);
    }
    const nextCountry =
      dto.addressCountry !== undefined
        ? assertValidLocationCountry(dto.addressCountry)
        : existing.addressCountry;
    if (dto.addressPincode !== undefined || dto.addressCountry !== undefined) {
      const postal =
        dto.addressPincode !== undefined
          ? dto.addressPincode
          : (existing.addressPincode ?? '');
      assertValidLocationPostal(nextCountry, postal);
    }
    await this.repo.updateOrganisationClient(organizationId, clientId, {
      ...(dto.clientName !== undefined ? { name: dto.clientName.trim() } : {}),
      ...(dto.addressLine1 !== undefined
        ? { addressLine1: dto.addressLine1.trim() }
        : {}),
      ...(dto.addressLine2 !== undefined
        ? { addressLine2: dto.addressLine2?.trim() ?? null }
        : {}),
      ...(dto.addressCity !== undefined
        ? { addressCity: dto.addressCity?.trim() ?? null }
        : {}),
      ...(dto.addressCountry !== undefined
        ? { addressCountry: nextCountry }
        : {}),
      ...(dto.addressState !== undefined
        ? { addressState: dto.addressState.trim() }
        : {}),
      ...(dto.addressDistrict !== undefined
        ? { addressDistrict: dto.addressDistrict.trim() }
        : {}),
      ...(dto.addressPincode !== undefined
        ? { addressPincode: dto.addressPincode.trim() }
        : {}),
    });
    if (dto.pointsOfContact) {
      await this.repo.replaceOrganisationClientPocs(
        clientId,
        dto.pointsOfContact.map((p, i) => this.toPocInsert(p, i)),
      );
    }
    return this.getById(organizationId, clientId);
  }

  async updateStatus(
    userId: string,
    organizationId: string,
    clientId: string,
    dto: UpdateOrganisationClientStatusDto,
  ) {
    const existing = await this.repo.getOrganisationClientInOrg(
      organizationId,
      clientId,
    );
    if (!existing) throw new NotFoundException('Client not found');

    if (dto.action === 'deactivate') {
      const reason = dto.reason?.trim();
      if (!reason) {
        throw new BadRequestException('Deactivate reason is required');
      }
      if (!existing.isActive) {
        throw new BadRequestException('Client is already inactive');
      }
      await this.repo.updateOrganisationClient(organizationId, clientId, {
        isActive: false,
      });
      await this.audit.log({
        organizationId,
        userId,
        action: 'organisation.client.deactivate',
        resourceType: 'organisation_client',
        resourceId: clientId,
        status: 'SUCCESS',
        metadata: { reason },
      });
    } else {
      if (existing.isActive) {
        throw new BadRequestException('Client is already active');
      }
      await this.repo.updateOrganisationClient(organizationId, clientId, {
        isActive: true,
      });
      const reason = dto.reason?.trim();
      await this.audit.log({
        organizationId,
        userId,
        action: 'organisation.client.activate',
        resourceType: 'organisation_client',
        resourceId: clientId,
        status: 'SUCCESS',
        metadata: reason ? { reason } : null,
      });
    }
    return this.getById(organizationId, clientId);
  }

  private toListItem(
    row: OrganisationClientRow,
    primary?: OrganisationClientPocRow,
  ) {
    return {
      id: row.id,
      clientName: row.name,
      primaryPoc: primary?.name ?? '—',
      phone: primary?.contactNumber ?? '',
      email: primary?.email ?? '',
      contracts: 0,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
    };
  }

  private toDetail(
    row: OrganisationClientRow,
    pocs: OrganisationClientPocRow[],
  ) {
    const contractHistory: OrganisationClientContractHistoryItem[] = [];
    return {
      id: row.id,
      clientName: row.name,
      status: row.isActive ? ('active' as const) : ('inactive' as const),
      isActive: row.isActive,
      address: formatLocationAddress(row),
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      addressCity: row.addressCity,
      addressState: row.addressState,
      addressDistrict: row.addressDistrict,
      addressPincode: row.addressPincode,
      addressCountry: row.addressCountry,
      pointsOfContact: pocs.map((p) => ({
        id: p.id,
        name: p.name,
        contactNumber: p.contactNumber,
        email: p.email,
        isPrimary: p.isPrimary,
      })),
      contracts: contractHistory,
      contractHistory,
      contractCount: contractHistory.length,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private assertPrimaryPocRules(pocs: OrganisationClientPocDto[]) {
    const primaryCount = pocs.filter((p) => p.isPrimary).length;
    if (primaryCount !== 1) {
      throw new BadRequestException(
        'Exactly one point of contact must be marked primary',
      );
    }
    for (const p of pocs) {
      if (!p.name.trim()) {
        throw new BadRequestException('POC name is required');
      }
      if (!p.contactNumber.trim()) {
        throw new BadRequestException('POC contact number is required');
      }
    }
  }

  private toPocInsert(p: OrganisationClientPocDto, sortOrder: number) {
    return {
      name: p.name.trim(),
      contactNumber: p.contactNumber.trim(),
      email: p.email.trim().toLowerCase(),
      isPrimary: p.isPrimary,
      sortOrder,
    };
  }
}
