import { ASSET_CLASS_NAME_MAX_LENGTH } from '../constants/asset-class.constants';

export type AssetClassSpecForName = {
  manufacturingYear?: number;
  modelName?: string;
  engineDisplacementCc?: number;
  fuelType: string;
  fuelSystem?: string;
  colorCode?: string;
};

function normalizeNameSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/** Model stays one name segment; internal spaces → hyphen (not `_`, which is the field separator). */
function normalizeModelNameSegment(modelName: string): string {
  return modelName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/** Locked format: {year}_{model}_{cc}_{fuelType}_{fuelSystem}_{colorCode} */
export function buildAssetClassNameFromSpec(
  spec: AssetClassSpecForName,
): string {
  const year =
    spec.manufacturingYear != null && spec.manufacturingYear > 0
      ? String(spec.manufacturingYear)
      : '0';
  const model = spec.modelName?.trim()
    ? normalizeModelNameSegment(spec.modelName)
    : 'na';
  const cc =
    spec.engineDisplacementCc != null && spec.engineDisplacementCc > 0
      ? String(spec.engineDisplacementCc)
      : '0';
  const fuelType = normalizeNameSegment(spec.fuelType) || 'na';
  const fuelSystem = spec.fuelSystem?.trim()
    ? normalizeNameSegment(spec.fuelSystem)
    : 'na';
  const colorCode = spec.colorCode?.trim()
    ? normalizeNameSegment(spec.colorCode)
    : 'na';
  const name = `${year}_${model}_${cc}_${fuelType}_${fuelSystem}_${colorCode}`;
  return name.slice(0, ASSET_CLASS_NAME_MAX_LENGTH);
}

/** Org-unique collision: append _2, _3, … (never block create for length). */
export function assetClassNameCollisionCandidate(
  baseName: string,
  attempt: number,
): string {
  if (attempt <= 1) {
    return baseName.slice(0, ASSET_CLASS_NAME_MAX_LENGTH);
  }
  const suffix = `_${attempt}`;
  const maxBase = ASSET_CLASS_NAME_MAX_LENGTH - suffix.length;
  const trimmedBase =
    maxBase > 0 ? baseName.slice(0, maxBase) : baseName.slice(0, 1);
  return (trimmedBase + suffix).slice(0, ASSET_CLASS_NAME_MAX_LENGTH);
}

export type AssetClassSpecForDisplay = AssetClassSpecForName & {
  brand: string;
  color: string;
};

export function buildAssetClassDisplayName(
  spec: AssetClassSpecForDisplay,
): string {
  const parts = [
    spec.brand.trim(),
    spec.modelName?.trim() ?? '',
    spec.engineDisplacementCc != null && spec.engineDisplacementCc > 0
      ? `${spec.engineDisplacementCc}cc`
      : '',
    spec.fuelType.trim(),
    spec.fuelSystem?.trim() ? `(${spec.fuelSystem.trim()})` : '',
    spec.color.trim(),
    spec.colorCode?.trim() ?? '',
  ].filter(Boolean);
  return (parts.join(' ') || spec.fuelType.trim() || 'Asset class').slice(
    0,
    ASSET_CLASS_NAME_MAX_LENGTH,
  );
}

/** Human-readable spec line for dropdowns (class name is the generated identifier). */
export function buildAssetClassSpecLabel(
  spec: AssetClassSpecForDisplay,
): string {
  return buildAssetClassDisplayName(spec);
}
