import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
  type PaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { AuthorizationRepository } from '../auth/authorization/authorization.repository';
import { OrganizationsRepository } from './organizations.repository';

export type OrganizationDto = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly authorizationRepository: AuthorizationRepository,
  ) {}

  async listOrganizations(
    userId: string,
    page = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedResult<OrganizationDto>> {
    const systemAccess =
      await this.authorizationRepository.userHasSystemScopeRole(userId);
    const { rows, total } = await this.organizationsRepository.listForUser(
      userId,
      page,
      pageSize,
      systemAccess,
    );
    return toPaginatedResult(
      rows.map((o) => this.toDto(o)),
      page,
      pageSize,
      total,
    );
  }

  async getOrganization(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationDto> {
    const org = await this.organizationsRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundException({
        message: 'Organization not found',
        code: 'ORGANIZATION_NOT_FOUND',
      });
    }

    const systemAccess =
      await this.authorizationRepository.userHasSystemScopeRole(userId);
    if (!systemAccess) {
      const member = await this.authorizationRepository.hasActiveMembership(
        userId,
        organizationId,
      );
      if (!member) {
        throw new ForbiddenException({
          message: 'You are not a member of this organization',
          code: 'ORGANIZATION_ACCESS_DENIED',
        });
      }
    }

    return this.toDto(org);
  }

  private toDto(o: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): OrganizationDto {
    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      isActive: o.isActive,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    };
  }
}
