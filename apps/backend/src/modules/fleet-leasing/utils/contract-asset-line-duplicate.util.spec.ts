import { BadRequestException } from '@nestjs/common';
import {
  assertNoDuplicateAssetClassNamesInRequest,
  assertNoDuplicateResolvedAssetClassIds,
  DUPLICATE_ASSET_CLASS_IN_REQUEST_MESSAGE,
} from './contract-asset-line-duplicate.util';

describe('contract-asset-line-duplicate.util', () => {
  it('rejects duplicate assetClass names case-insensitively', () => {
    expect(() =>
      assertNoDuplicateAssetClassNamesInRequest([
        { assetClass: '2026_nx-150_110_petrol_efi_bl' },
        { assetClass: '2026_NX-150_110_PETROL_EFI_BL' },
      ]),
    ).toThrow(BadRequestException);

    try {
      assertNoDuplicateAssetClassNamesInRequest([
        { assetClass: 'Sedan' },
        { assetClass: ' sedan ' },
      ]);
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).message).toBe(
        DUPLICATE_ASSET_CLASS_IN_REQUEST_MESSAGE,
      );
    }
  });

  it('allows distinct asset classes', () => {
    expect(() =>
      assertNoDuplicateAssetClassNamesInRequest([
        { assetClass: 'Sedan' },
        { assetClass: 'SUV' },
      ]),
    ).not.toThrow();
  });

  it('rejects duplicate resolved class ids', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(() =>
      assertNoDuplicateResolvedAssetClassIds([{ id }, { id }]),
    ).toThrow(BadRequestException);
  });
});
