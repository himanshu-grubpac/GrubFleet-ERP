import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetRegisterRepository } from './repositories/asset-register.repository';
import { buildAssetClassSpecLabel } from './utils/asset-class-name.util';

export type ActiveAssetClassCatalogItem = {
  id: string;
  name: string;
  specLabel: string;
};

export type ResolvedAssetClassReference = {
  id: string;
  name: string;
};

/**
 * Cross-module read API for fleet-leasing wizard (asset class catalog + availability).
 * Lease lines store {@link assetClassId} (stable) and denormalized {@link assetClass} name.
 */
@Injectable()
export class AssetRegisterCatalogService {
  constructor(private readonly repo: AssetRegisterRepository) {}

  /** Active asset register classes for wizard dropdowns (id + current name + specLabel). */
  async listActiveAssetClassCatalog(
    organizationId: string,
    page: number,
    pageSize: number,
  ): Promise<{ catalog: ActiveAssetClassCatalogItem[]; total: number }> {
    const { rows, total } = await this.repo.listAssetClasses(
      organizationId,
      page,
      pageSize,
      { isActive: true, orderByName: true },
    );
    const catalog = rows.map((row) => ({
      id: row.id,
      name: row.name,
      specLabel: buildAssetClassSpecLabel({
        brand: row.brand,
        modelName: row.modelName,
        manufacturingYear: row.manufacturingYear,
        engineDisplacementCc: row.engineDisplacementCc,
        fuelType: row.fuelType,
        fuelSystem: row.fuelSystem,
        color: row.color,
        colorCode: row.colorCode,
      }),
    }));
    return { catalog, total };
  }

  /** @deprecated Prefer {@link listActiveAssetClassCatalog} — name strings only. */
  async listDistinctActiveAssetClassNames(
    organizationId: string,
    page: number,
    pageSize: number,
  ) {
    return this.repo.listDistinctActiveAssetClassNamesPaginated(
      organizationId,
      page,
      pageSize,
    );
  }

  async listActiveAssetClassesByIds(
    organizationId: string,
    assetClassIds: string[],
  ) {
    return this.repo.listActiveAssetClassesByIds(organizationId, assetClassIds);
  }

  /**
   * Availability preview only — unknown legacy name yields 0 inventory (no throw).
   */
  async resolveAssetClassForAvailabilityPreview(
    organizationId: string,
    input: { assetClass?: string; assetClassId?: string },
  ): Promise<{ id?: string; name: string }> {
    try {
      return await this.resolveActiveAssetClassReference(organizationId, input);
    } catch (err) {
      const name = input.assetClass?.trim();
      if (name) {
        return { name };
      }
      throw err;
    }
  }

  async resolveActiveAssetClassReference(
    organizationId: string,
    input: { assetClass?: string; assetClassId?: string },
  ): Promise<ResolvedAssetClassReference> {
    const id = input.assetClassId?.trim();
    const name = input.assetClass?.trim();
    if (id) {
      const row = await this.repo.getAssetClassInOrg(organizationId, id);
      if (!row?.isActive) {
        throw new NotFoundException('Asset class not found');
      }
      if (name && name !== row.name.trim()) {
        throw new BadRequestException(
          'assetClass does not match assetClassId for this organization',
        );
      }
      return { id: row.id, name: row.name.trim() };
    }
    if (name) {
      const row = await this.repo.getActiveAssetClassByName(
        organizationId,
        name,
      );
      if (!row) {
        throw new BadRequestException({
          code: 'UNKNOWN_ASSET_CLASS',
          message: `Unknown asset class "${name}" — create it in Asset Register first`,
          assetClass: name,
        });
      }
      return { id: row.id, name: row.name.trim() };
    }
    throw new BadRequestException(
      'Each asset line requires assetClassId or assetClass',
    );
  }

  /** True when an active class with this exact trimmed name exists in the org. */
  async activeAssetClassNameExists(
    organizationId: string,
    assetClassName: string,
  ): Promise<boolean> {
    const name = assetClassName.trim();
    if (!name) return false;
    const row = await this.repo.getActiveAssetClassByName(organizationId, name);
    return Boolean(row);
  }

  /**
   * Wizard inventory from asset register vehicles (not legacy fleet_vehicles).
   * availableNow: active lifecycle + operationalStatus available.
   * inbound: no register equivalent in v1 — always 0.
   */
  async getAssetClassInventory(
    organizationId: string,
    assetClassName: string,
  ): Promise<{ availableNow: number; inbound: number }> {
    const map = await this.getAssetClassInventoryBatch(organizationId, [
      assetClassName,
    ]);
    const availableNow = map.get(assetClassName.trim()) ?? 0;
    return { availableNow, inbound: 0 };
  }

  async getAssetClassInventoryByClassId(
    organizationId: string,
    assetClassId: string,
  ): Promise<{ availableNow: number; inbound: number; name: string }> {
    const row = await this.repo.getAssetClassInOrg(
      organizationId,
      assetClassId,
    );
    if (!row?.isActive) {
      throw new NotFoundException('Asset class not found');
    }
    const counts = await this.repo.countAvailableVehiclesByClassIds(
      organizationId,
      [assetClassId],
    );
    return {
      name: row.name.trim(),
      availableNow: counts.get(assetClassId) ?? 0,
      inbound: 0,
    };
  }

  async getAssetClassInventoryBatch(
    organizationId: string,
    assetClassNames: string[],
  ): Promise<Map<string, number>> {
    return this.repo.countAvailableVehiclesForClassNames(
      organizationId,
      assetClassNames,
    );
  }

  async getAssetClassInventoryBatchByIds(
    organizationId: string,
    assetClassIds: string[],
  ): Promise<Map<string, number>> {
    const counts = await this.repo.countAvailableVehiclesByClassIds(
      organizationId,
      assetClassIds,
    );
    return counts;
  }
}
