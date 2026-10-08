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
import { ClientsService } from '../organisation/clients.service';
import { OrganisationRepository } from '../organisation/repositories/organisation.repository';
import { formatLocationAddress } from '../organisation/utils/format-location-address.util';
import type { ClientPocDto } from './dto/client-poc.dto';
import type { CreateFleetClientDto } from './dto/create-fleet-client.dto';
import type { ListFleetClientsQueryDto } from './dto/list-fleet-clients-query.dto';
import type { UpdateFleetClientDto } from './dto/update-fleet-client.dto';
import { FleetLeasingRepository } from './repositories/fleet-leasing.repository';
import { resolveFleetClientCompanyDisplayName } from './utils/fleet-client-display.util';

@Injectable()
export class FleetClientsService {
  constructor(
    private readonly repo: FleetLeasingRepository,
    private readonly orgRepo: OrganisationRepository,
    @Inject(forwardRef(() => ClientsService))
    private readonly organisationClients: ClientsService,
  ) {}

  async getLinkedFleetClientId(
    organizationId: string,
    organisationClientId: string,
  ): Promise<string | null> {
    const row = await this.repo.findFleetClientByOrganisationClientId(
      organizationId,
      organisationClientId,
    );
    return row?.id ?? null;
  }

  /**
   * Ensures a fleet_clients row exists for an organisation client (lease contracts reference fleet id).
   */
  async syncFromOrganisationClient(
    organizationId: string,
    organisationClientId: string,
    options?: { taxId?: string | null },
  ) {
    const existing = await this.repo.findFleetClientByOrganisationClientId(
      organizationId,
      organisationClientId,
    );
    if (existing) {
      if (options?.taxId !== undefined) {
        await this.repo.updateClient(existing.id, organizationId, {
          taxId: options.taxId?.trim() || null,
        });
      }
      return existing;
    }

    const bundle = await this.orgRepo.getOrganisationClientWithPocs(
      organizationId,
      organisationClientId,
    );
    if (!bundle) {
      throw new NotFoundException('Organisation client not found');
    }

    const clientCode = `OC-${organisationClientId.replace(/-/g, '').slice(0, 20)}`;
    let inserted;
    try {
      inserted = await this.repo.insertClient({
        organizationId,
        organisationClientId,
        clientCode,
        companyName: bundle.client.name.trim(),
        taxId: options?.taxId?.trim() || null,
        address: formatLocationAddress(bundle.client),
        isActive: bundle.client.isActive,
      });
    } catch {
      const raced = await this.repo.findFleetClientByOrganisationClientId(
        organizationId,
        organisationClientId,
      );
      if (raced) {
        return raced;
      }
      throw new BadRequestException('Could not create fleet client link');
    }

    await this.repo.replaceClientPocs(
      inserted.id,
      bundle.pocs.map((p, i) => ({
        name: p.name,
        contactNumber: p.contactNumber,
        email: p.email,
        isPrimary: p.isPrimary,
        sortOrder: i,
      })),
    );

    return inserted;
  }

  async list(query: ListFleetClientsQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows: orgRows, total } = await this.orgRepo.listOrganisationClients(
      query.organizationId,
      page,
      pageSize,
      {
        search: query.search,
        isActive: true,
      },
    );

    const fleetRows = [];
    for (const orgRow of orgRows) {
      fleetRows.push(
        await this.syncFromOrganisationClient(query.organizationId, orgRow.id),
      );
    }

    const contractCounts = await this.repo.countContractsForClients(
      fleetRows.map((row) => row.id),
    );

    const orgNameById = new Map(orgRows.map((row) => [row.id, row.name]));

    const items = await Promise.all(
      fleetRows.map(async (row) => {
        const primary = await this.repo.getPrimaryPocForClient(row.id);
        const orgName = row.organisationClientId
          ? orgNameById.get(row.organisationClientId)
          : undefined;
        const companyName =
          resolveFleetClientCompanyDisplayName(row.companyName, orgName) ??
          row.companyName;
        return {
          id: row.id,
          clientCode: row.clientCode,
          companyName,
          taxId: row.taxId,
          address: row.address,
          isActive: row.isActive,
          primaryPoc: primary
            ? {
                id: primary.id,
                name: primary.name,
                email: primary.email,
                contactNumber: primary.contactNumber,
              }
            : null,
          contractCount: contractCounts.get(row.id) ?? 0,
        };
      }),
    );

    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, clientId: string) {
    const client = await this.repo.getClientWithPocs(organizationId, clientId);
    if (!client) throw new NotFoundException('Client not found');
    const contractCount = await this.repo.countContractsForClient(clientId);
    const companyName =
      resolveFleetClientCompanyDisplayName(
        client.client.companyName,
        client.organisationClientName,
      ) ?? client.client.companyName;
    return {
      id: client.client.id,
      clientCode: client.client.clientCode,
      companyName,
      taxId: client.client.taxId,
      address: client.client.address,
      isActive: client.client.isActive,
      contractCount,
      pointsOfContact: client.pocs.map((p) => ({
        id: p.id,
        name: p.name,
        contactNumber: p.contactNumber,
        email: p.email,
        isPrimary: p.isPrimary,
      })),
      createdAt: client.client.createdAt.toISOString(),
      updatedAt: client.client.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateFleetClientDto) {
    this.assertPrimaryPocRules(dto.pointsOfContact);
    const orgDto = this.toOrganisationCreateDto(dto);
    const orgDetail = await this.organisationClients.create(orgDto);
    const fleet = await this.repo.findFleetClientByOrganisationClientId(
      dto.organizationId,
      orgDetail.id,
    );
    if (!fleet) {
      throw new BadRequestException(
        'Fleet client link was not created for organisation client',
      );
    }
    if (dto.taxId?.trim()) {
      await this.repo.updateClient(fleet.id, dto.organizationId, {
        taxId: dto.taxId.trim(),
      });
    }
    return this.getById(dto.organizationId, fleet.id);
  }

  async update(
    organizationId: string,
    clientId: string,
    dto: UpdateFleetClientDto,
  ) {
    const existing = await this.repo.getClientInOrg(organizationId, clientId);
    if (!existing) throw new NotFoundException('Client not found');
    if (dto.pointsOfContact) {
      this.assertPrimaryPocRules(dto.pointsOfContact);
    }
    await this.repo.updateClient(clientId, organizationId, {
      companyName: dto.companyName?.trim(),
      taxId: dto.taxId === undefined ? undefined : dto.taxId.trim() || null,
      address: dto.address?.trim(),
    });
    if (dto.pointsOfContact) {
      await this.repo.replaceClientPocs(
        clientId,
        dto.pointsOfContact.map((p, i) => this.toPocInsert(p, i)),
      );
    }
    return this.getById(organizationId, clientId);
  }

  private toOrganisationCreateDto(dto: CreateFleetClientDto) {
    const hasStructuredAddress =
      Boolean(dto.addressLine1?.trim()) &&
      Boolean(dto.addressCountry?.trim()) &&
      Boolean(dto.addressState?.trim()) &&
      Boolean(dto.addressDistrict?.trim()) &&
      Boolean(dto.addressPincode?.trim());

    const addressLine1 = hasStructuredAddress
      ? dto.addressLine1!.trim()
      : dto.address?.trim() || dto.companyName.trim();
    const addressCountry = (
      hasStructuredAddress ? dto.addressCountry! : (dto.addressCountry ?? 'IN')
    )
      .trim()
      .toUpperCase();
    const addressState = hasStructuredAddress
      ? dto.addressState!.trim()
      : dto.addressState?.trim() || 'Not specified';
    const addressDistrict = hasStructuredAddress
      ? dto.addressDistrict!.trim()
      : dto.addressDistrict?.trim() || addressState;
    const addressPincode = hasStructuredAddress
      ? dto.addressPincode!.trim()
      : dto.addressPincode?.trim() || '110001';

    return {
      organizationId: dto.organizationId,
      clientName: dto.companyName.trim(),
      addressLine1,
      addressLine2: dto.addressLine2?.trim(),
      addressCity: dto.addressCity?.trim(),
      addressCountry,
      addressState,
      addressDistrict,
      addressPincode,
      pointsOfContact: dto.pointsOfContact,
    };
  }

  private assertPrimaryPocRules(pocs: ClientPocDto[]) {
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

  private toPocInsert(p: ClientPocDto, sortOrder: number) {
    return {
      name: p.name.trim(),
      contactNumber: p.contactNumber.trim(),
      email: p.email.trim().toLowerCase(),
      isPrimary: p.isPrimary,
      sortOrder,
    };
  }
}
