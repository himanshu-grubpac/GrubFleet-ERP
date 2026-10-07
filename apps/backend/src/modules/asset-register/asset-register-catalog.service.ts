import { Injectable } from '@nestjs/common';
import { AssetRegisterRepository } from './repositories/asset-register.repository';

/**
 * Cross-module read API for fleet-leasing wizard (asset class names + availability).
 * Lease contract asset lines store {@link assetClass} as asset register class name.
 */
@Injectable()
export class AssetRegisterCatalogService {
  constructor(private readonly repo: AssetRegisterRepository) {}

  /** Active asset register class names (wizard dropdown). */
  async listDistinctActiveAssetClassNames(
    organizationId: string,
  ): Promise<string[]> {
    return this.repo.listDistinctActiveAssetClassNames(organizationId);
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
    const name = assetClassName.trim();
    const availableNow = await this.repo.countAvailableVehiclesForClassName(
      organizationId,
      name,
    );
    return { availableNow, inbound: 0 };
  }
}
