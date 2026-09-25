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
import type { ClientPocDto } from './dto/client-poc.dto';
import type { CreateFleetClientDto } from './dto/create-fleet-client.dto';
import type { ListFleetClientsQueryDto } from './dto/list-fleet-clients-query.dto';
import type { UpdateFleetClientDto } from './dto/update-fleet-client.dto';
import { FleetLeasingRepository } from './repositories/fleet-leasing.repository';

@Injectable()
export class FleetClientsService {
  constructor(private readonly repo: FleetLeasingRepository) {}

  async list(query: ListFleetClientsQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } = await this.repo.searchClients(
      query.organizationId,
      page,
      pageSize,
      query.search,
    );
    const items = await Promise.all(
      rows.map(async (row) => {
        const contractCount = await this.repo.countContractsForClient(row.id);
        const primary = row.primaryPoc;
        return {
          id: row.id,
          clientCode: row.clientCode,
          companyName: row.companyName,
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
          contractCount,
        };
      }),
    );
    return toPaginatedResult(items, page, pageSize, total);
  }

  async getById(organizationId: string, clientId: string) {
    const client = await this.repo.getClientWithPocs(organizationId, clientId);
    if (!client) throw new NotFoundException('Client not found');
    const contractCount = await this.repo.countContractsForClient(clientId);
    return {
      id: client.client.id,
      clientCode: client.client.clientCode,
      companyName: client.client.companyName,
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
    const seq = await this.repo.countClientsInOrg(dto.organizationId);
    const client = await this.repo.insertClient({
      organizationId: dto.organizationId,
      clientCode: `CL-${1000 + seq + 1}`,
      companyName: dto.companyName.trim(),
      address: dto.address?.trim() ?? null,
    });
    await this.repo.replaceClientPocs(
      client.id,
      dto.pointsOfContact.map((p, i) => this.toPocInsert(p, i)),
    );
    return this.getById(dto.organizationId, client.id);
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
