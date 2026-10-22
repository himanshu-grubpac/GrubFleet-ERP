import { BadRequestException } from '@nestjs/common';
import { DUPLICATE_ASSET_CLASS_IN_REQUEST_MESSAGE } from './contract-asset-line-duplicate.util';

export type ExistingContractAssetLine = {
  assetClass: string;
  committedQuantity: number;
};

export type IncomingContractAssetLine = {
  assetClass?: string;
  committedQuantity: number;
};

function normalizeAssetClassKey(assetClass: string | undefined): string {
  return (assetClass ?? '').trim().toLowerCase();
}

/**
 * Active / awaiting-assets edits: add lines or increase qty; never remove lines or
 * reduce qty below vehicles already allocated on that class.
 */
export function assertActiveContractAssetLineChangesAllowed(
  existing: ExistingContractAssetLine[],
  incoming: IncomingContractAssetLine[],
  allocatedCountByClass: Record<string, number>,
): void {
  const incomingByClass = new Map<string, IncomingContractAssetLine>();

  for (const line of incoming) {
    const key = normalizeAssetClassKey(line.assetClass);
    if (!key) {
      throw new BadRequestException(
        'Each asset-class line must specify an asset class',
      );
    }
    if (incomingByClass.has(key)) {
      throw new BadRequestException(DUPLICATE_ASSET_CLASS_IN_REQUEST_MESSAGE);
    }
    incomingByClass.set(key, line);
  }

  for (const row of existing) {
    const key = normalizeAssetClassKey(row.assetClass);
    const next = incomingByClass.get(key);
    if (!next) {
      throw new BadRequestException(
        `Cannot remove the ${row.assetClass.trim()} line while the contract is active`,
      );
    }
    const allocated =
      allocatedCountByClass[row.assetClass.trim()] ??
      allocatedCountByClass[key] ??
      0;
    if (next.committedQuantity < allocated) {
      throw new BadRequestException(
        `Requested quantity for ${row.assetClass.trim()} cannot be less than ${allocated} already allocated on this contract`,
      );
    }
  }
}
