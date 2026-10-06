import { ASSET_CLASS_CODE_MAX_LENGTH } from '../constants/asset-class.constants';

/** Initials from class name words (first letter per word), uppercase, max 8 chars. */
export function deriveAssetClassCodeBase(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'AC';

  const words = trimmed.split(/\s+/).filter(Boolean);
  const fromWords = words
    .map((word) => {
      const match = word.match(/[A-Za-z]/);
      return match ? match[0].toUpperCase() : '';
    })
    .filter(Boolean)
    .join('');

  if (fromWords.length > 0) {
    return fromWords.slice(0, ASSET_CLASS_CODE_MAX_LENGTH);
  }

  const alnum = trimmed.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return (alnum.slice(0, ASSET_CLASS_CODE_MAX_LENGTH) || 'AC').slice(
    0,
    ASSET_CLASS_CODE_MAX_LENGTH,
  );
}

/** Unique per org: base, then base-2, base-3, … (truncate base so full code ≤ 8). */
export function assetClassCodeCandidate(base: string, attempt: number): string {
  if (attempt <= 1) {
    return base.slice(0, ASSET_CLASS_CODE_MAX_LENGTH);
  }
  const suffix = `-${attempt}`;
  const maxBaseLen = ASSET_CLASS_CODE_MAX_LENGTH - suffix.length;
  if (maxBaseLen < 1) {
    return suffix.slice(0, ASSET_CLASS_CODE_MAX_LENGTH);
  }
  return base.slice(0, maxBaseLen) + suffix;
}
