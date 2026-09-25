import {
  buildContractLineAllocationRow,
  resolveContractLineAllocationStatus,
} from './contract-line-allocation.util';

describe('resolveContractLineAllocationStatus', () => {
  it('Figma case 1 — fully allocated line (Sedan 3/3)', () => {
    expect(
      resolveContractLineAllocationStatus({
        committedQuantity: 3,
        allocatedCount: 3,
        awaitingAssetsLine: false,
        shortfallCount: 0,
        availabilityStatus: 'covered',
      }),
    ).toBe('allocated');
  });

  it('Figma case 2 — all awaiting (SUV 4/0)', () => {
    expect(
      resolveContractLineAllocationStatus({
        committedQuantity: 4,
        allocatedCount: 0,
        awaitingAssetsLine: false,
        shortfallCount: 0,
        availabilityStatus: 'partial_today',
      }),
    ).toBe('awaiting_assets');
  });

  it('Figma case 3 — partial (SUV 2/4) and shortfall awaiting (Pickup 0/2)', () => {
    expect(
      resolveContractLineAllocationStatus({
        committedQuantity: 4,
        allocatedCount: 2,
        awaitingAssetsLine: false,
        shortfallCount: 0,
        availabilityStatus: 'partial_today',
      }),
    ).toBe('partially_allocated');

    expect(
      resolveContractLineAllocationStatus({
        committedQuantity: 2,
        allocatedCount: 0,
        awaitingAssetsLine: true,
        shortfallCount: 2,
        availabilityStatus: 'shortfall',
      }),
    ).toBe('awaiting_assets');
  });
});

describe('buildContractLineAllocationRow', () => {
  it('builds detail messages for mixed confirmation table', () => {
    const sedan = buildContractLineAllocationRow({
      assetClass: 'Sedan',
      committedQuantity: 3,
      allocatedCount: 3,
      inboundCount: 0,
      shortfallCount: 0,
      awaitingAssetsLine: false,
      availabilityStatus: 'covered',
    });
    expect(sedan.lineStatus).toBe('allocated');

    const suv = buildContractLineAllocationRow({
      assetClass: 'SUV',
      committedQuantity: 4,
      allocatedCount: 2,
      inboundCount: 2,
      shortfallCount: 0,
      awaitingAssetsLine: false,
      availabilityStatus: 'partial_today',
    });
    expect(suv.lineStatus).toBe('partially_allocated');
    expect(suv.detailMessage).toBe('2 more once Inbound arrives');

    const pickup = buildContractLineAllocationRow({
      assetClass: 'Pickup',
      committedQuantity: 2,
      allocatedCount: 0,
      inboundCount: 1,
      shortfallCount: 1,
      awaitingAssetsLine: true,
      availabilityStatus: 'shortfall',
    });
    expect(pickup.lineStatus).toBe('awaiting_assets');
    expect(pickup.detailMessage).toContain('shortfall confirmed');
  });
});
