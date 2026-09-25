import { evaluateContractPricing } from './contract-pricing-engine.util';

describe('evaluateContractPricing', () => {
  const lines = [
    { assetClass: 'Sedan', committedQuantity: 3, ratePerVehicleMonth: '34500' },
  ];

  it('requires deposit before review', () => {
    const r = evaluateContractPricing({ securityDeposit: null, assetLines: lines });
    expect(r.depositRequired).toBe(true);
    expect(r.canProceedToReview).toBe(false);
  });

  it('passes when deposit meets monthly commitment floor', () => {
    const r = evaluateContractPricing({
      securityDeposit: '103500',
      assetLines: lines,
    });
    expect(r.withinStandardLimits).toBe(true);
    expect(r.requiresApproval).toBe(false);
  });

  it('requires approval when rate off standard card', () => {
    const r = evaluateContractPricing({
      securityDeposit: '103500',
      assetLines: [
        { assetClass: 'Sedan', committedQuantity: 3, ratePerVehicleMonth: '32000' },
      ],
    });
    expect(r.requiresApproval).toBe(true);
  });
});
