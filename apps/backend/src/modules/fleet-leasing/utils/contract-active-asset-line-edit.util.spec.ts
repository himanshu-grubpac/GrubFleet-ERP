import { BadRequestException } from '@nestjs/common';
import { assertActiveContractAssetLineChangesAllowed } from './contract-active-asset-line-edit.util';

describe('assertActiveContractAssetLineChangesAllowed', () => {
  const existing = [{ assetClass: 'sedan_a', committedQuantity: 3 }];

  it('allows adding a new asset-class line', () => {
    expect(() =>
      assertActiveContractAssetLineChangesAllowed(
        existing,
        [
          { assetClass: 'sedan_a', committedQuantity: 3 },
          { assetClass: 'suv_b', committedQuantity: 2 },
        ],
        { sedan_a: 1 },
      ),
    ).not.toThrow();
  });

  it('allows increasing quantity on an existing line', () => {
    expect(() =>
      assertActiveContractAssetLineChangesAllowed(
        existing,
        [{ assetClass: 'sedan_a', committedQuantity: 5 }],
        { sedan_a: 2 },
      ),
    ).not.toThrow();
  });

  it('rejects removing an existing line', () => {
    expect(() =>
      assertActiveContractAssetLineChangesAllowed(
        existing,
        [{ assetClass: 'suv_b', committedQuantity: 1 }],
        {},
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects quantity below allocated count', () => {
    expect(() =>
      assertActiveContractAssetLineChangesAllowed(
        existing,
        [{ assetClass: 'sedan_a', committedQuantity: 2 }],
        { sedan_a: 3 },
      ),
    ).toThrow(/cannot be less than 3/i);
  });
});
