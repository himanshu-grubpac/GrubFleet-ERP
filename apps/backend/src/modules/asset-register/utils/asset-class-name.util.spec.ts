import {
  assetClassNameCollisionCandidate,
  buildAssetClassNameFromSpec,
} from './asset-class-name.util';

describe('buildAssetClassNameFromSpec', () => {
  it('builds locked meeting example', () => {
    expect(
      buildAssetClassNameFromSpec({
        manufacturingYear: 2026,
        modelName: 'Activa',
        engineDisplacementCc: 150,
        fuelType: 'Petrol',
        fuelSystem: 'efi',
        colorCode: 'bl',
      }),
    ).toBe('2026_activa_150_petrol_efi_bl');
  });

  it('normalizes model internal spaces to hyphens', () => {
    expect(
      buildAssetClassNameFromSpec({
        manufacturingYear: 2026,
        modelName: 'Activa 6G',
        engineDisplacementCc: 150,
        fuelType: 'petrol',
        fuelSystem: 'efi',
        colorCode: 'bl',
      }),
    ).toBe('2026_activa-6g_150_petrol_efi_bl');
  });

  it('uses placeholder segments when spec fields omitted', () => {
    expect(
      buildAssetClassNameFromSpec({
        fuelType: 'diesel',
      }),
    ).toBe('0_na_0_diesel_na_na');
  });
});

describe('assetClassNameCollisionCandidate', () => {
  it('returns base on first attempt', () => {
    expect(
      assetClassNameCollisionCandidate('2026_activa_150_petrol_efi_bl', 1),
    ).toBe('2026_activa_150_petrol_efi_bl');
  });

  it('appends numeric suffix on collision attempts', () => {
    expect(
      assetClassNameCollisionCandidate('2026_activa_150_petrol_efi_bl', 2),
    ).toBe('2026_activa_150_petrol_efi_bl_2');
  });
});
