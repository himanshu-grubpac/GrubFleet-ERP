import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateLocationTypeDto } from './dto/create-location-type.dto';
import { OrganisationRepository } from './repositories/organisation.repository';

@Injectable()
export class LocationTypesService {
  constructor(private readonly repo: OrganisationRepository) {}

  async list(organizationId: string) {
    const rows = await this.repo.listLocationTypesWithUsage(organizationId);
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        presetKey: row.presetKey,
        isCustom: !row.isSystem,
        isUsed: row.locationCount > 0,
        locationCount: row.locationCount,
      })),
    };
  }

  async create(dto: CreateLocationTypeDto) {
    const trimmed = dto.name.trim();
    if (!trimmed) {
      throw new BadRequestException('Location type name is required');
    }
    const existing = await this.repo.resolveLocationTypeByName(
      dto.organizationId,
      trimmed,
    );
    if (existing) {
      throw new ConflictException(
        'Location type with this name already exists',
      );
    }
    const row = await this.repo.insertCustomLocationType(
      dto.organizationId,
      trimmed,
    );
    return {
      id: row.id,
      name: row.name,
      presetKey: row.presetKey,
      isCustom: true,
      isUsed: false,
      locationCount: 0,
    };
  }

  async deleteCustom(organizationId: string, typeId: string) {
    const typeRow = await this.repo.getLocationTypeInOrg(
      organizationId,
      typeId,
    );
    if (!typeRow) {
      throw new NotFoundException('Location type not found');
    }
    if (typeRow.isSystem) {
      throw new BadRequestException('System location types cannot be deleted');
    }
    const usage = await this.repo.countLocationsForType(typeId);
    if (usage > 0) {
      throw new ConflictException(
        'Location type is in use and cannot be deleted',
      );
    }
    const deleted = await this.repo.deleteLocationType(organizationId, typeId);
    if (!deleted) {
      throw new NotFoundException('Location type not found');
    }
    return { success: true };
  }
}
