import {
  buildContractReviewMessages,
  computeCanSubmitReview,
  resolveReviewAction,
} from './contract-review.util';
import { evaluateContractPricing } from './contract-pricing-engine.util';

describe('contract-review.util', () => {
  const standardPricing = evaluateContractPricing({
    securityDeposit: '69000',
    assetLines: [
      { assetClass: 'Sedan', committedQuantity: 2, ratePerVehicleMonth: '34500' },
    ],
  });

  const approvalPricing = evaluateContractPricing({
    securityDeposit: '50000',
    assetLines: [
      { assetClass: 'Sedan', committedQuantity: 2, ratePerVehicleMonth: '1000' },
    ],
  });

  it('resolves review action from pricing', () => {
    expect(resolveReviewAction(approvalPricing)).toBe('submit_for_approval');
    expect(resolveReviewAction(standardPricing)).toBe('confirm_contract');
  });

  it('computes canSubmit for draft with client and complete pricing', () => {
    expect(
      computeCanSubmitReview({
        status: 'draft',
        clientId: 'client-1',
        pricing: standardPricing,
      }),
    ).toBe(true);
    expect(
      computeCanSubmitReview({
        status: 'pending_approval',
        clientId: 'client-1',
        pricing: standardPricing,
      }),
    ).toBe(false);
  });

  it('builds warning for approval path and info for partial/awaiting lines', () => {
    const messages = buildContractReviewMessages({
      pricing: approvalPricing,
      assetLines: [
        {
          assetClass: 'Pickup',
          committedQuantity: 2,
          ratePerVehicleMonth: '1000',
          availabilityStatus: 'shortfall',
          availableNowCount: 0,
          inboundCount: 1,
          shortfallCount: 1,
          awaitingAssetsLine: true,
          availabilityMessage: '',
        },
        {
          assetClass: 'SUV',
          committedQuantity: 4,
          ratePerVehicleMonth: '1000',
          availabilityStatus: 'partial_today',
          availableNowCount: 2,
          inboundCount: 2,
          shortfallCount: 0,
          awaitingAssetsLine: false,
          availabilityMessage: '',
        },
      ],
    });
    expect(messages.some((m) => m.level === 'warning' && m.code === 'PRICING_REQUIRES_APPROVAL')).toBe(
      true,
    );
    expect(messages.some((m) => m.code === 'LINE_AWAITING_ASSETS' && m.text.includes('Pickup'))).toBe(
      true,
    );
    expect(
      messages.some((m) => m.code === 'LINE_PARTIALLY_ALLOCATED' && m.text.includes('SUV')),
    ).toBe(true);
  });

  it('builds confirm-path billing info when fully covered', () => {
    const messages = buildContractReviewMessages({
      pricing: standardPricing,
      assetLines: [
        {
          assetClass: 'Sedan',
          committedQuantity: 2,
          ratePerVehicleMonth: '34500',
          availabilityStatus: 'covered',
          availableNowCount: 5,
          inboundCount: 0,
          shortfallCount: 0,
          awaitingAssetsLine: false,
          availabilityMessage: '',
        },
      ],
    });
    expect(messages.some((m) => m.code === 'BILLING_ON_START')).toBe(true);
    expect(messages.some((m) => m.level === 'warning')).toBe(false);
  });
});
