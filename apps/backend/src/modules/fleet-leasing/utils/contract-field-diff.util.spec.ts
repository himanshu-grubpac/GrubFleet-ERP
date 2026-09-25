import {
  computeContractFieldDiff,
  contractRowToSnapshot,
} from './contract-field-diff.util';

describe('contract-field-diff.util', () => {
  const base = contractRowToSnapshot({
    clientId: 'a',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    termMonths: 12,
    securityDeposit: '1000.00',
    billingFrequency: 'monthly',
    additionalTerms: null,
    amcTier: 'Gold',
    description: 'x',
    assetLines: [
      { assetClass: 'Sedan', committedQuantity: 2, ratePerVehicleMonth: '500.00' },
    ],
    vehicleIds: ['v1'],
  });

  it('returns empty diff when unchanged', () => {
    expect(computeContractFieldDiff(base, { ...base })).toEqual([]);
  });

  it('detects scalar and collection changes', () => {
    const after = {
      ...base,
      termMonths: 24,
      vehicleIds: ['v1', 'v2'],
    };
    const diff = computeContractFieldDiff(base, after);
    expect(diff.map((d) => d.field)).toEqual(['termMonths', 'vehicleIds']);
  });
});
