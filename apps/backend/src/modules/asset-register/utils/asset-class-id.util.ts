/** First allocated 6-digit class id per organization (000001). */
export const ASSET_CLASS_ID_SEQUENCE_START = 1;

export const ASSET_CLASS_ID_LENGTH = 6;

export function formatAssetClassId(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('Invalid asset class id sequence');
  }
  if (sequence > 999_999) {
    throw new Error('Asset class id sequence exhausted for organization');
  }
  return String(sequence).padStart(ASSET_CLASS_ID_LENGTH, '0');
}

export function isAssetClassIdFormat(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}
