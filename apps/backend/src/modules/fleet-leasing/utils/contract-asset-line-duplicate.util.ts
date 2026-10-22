import { BadRequestException } from '@nestjs/common';

export const DUPLICATE_ASSET_CLASS_IN_REQUEST_MESSAGE =
  'Each asset class may only appear once on the contract. Combine quantities on a single line.';

export function normalizeAssetClassLineKey(assetClass: string): string {
  return assetClass.trim().toLowerCase();
}

/** Duplicate assetClass names in one request (trim, case-insensitive). */
export function assertNoDuplicateAssetClassNamesInRequest(
  lines: Array<{ assetClass?: string; assetClassId?: string }>,
): void {
  const seen = new Set<string>();
  for (const line of lines) {
    if (line.assetClassId?.trim()) {
      continue;
    }
    const name = line.assetClass?.trim();
    if (!name) {
      continue;
    }
    const key = normalizeAssetClassLineKey(name);
    if (seen.has(key)) {
      throw new BadRequestException(DUPLICATE_ASSET_CLASS_IN_REQUEST_MESSAGE);
    }
    seen.add(key);
  }
}

/** Duplicate resolved register class ids in one request. */
export function assertNoDuplicateResolvedAssetClassIds(
  resolved: Array<{ id: string | null | undefined }>,
): void {
  const seen = new Set<string>();
  for (const ref of resolved) {
    const id = ref.id?.trim();
    if (!id) {
      continue;
    }
    const key = id.toLowerCase();
    if (seen.has(key)) {
      throw new BadRequestException(DUPLICATE_ASSET_CLASS_IN_REQUEST_MESSAGE);
    }
    seen.add(key);
  }
}
