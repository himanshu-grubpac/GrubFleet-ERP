import { RENEWABLE_CONTRACT_STATUSES } from '../constants/lease-contract-status';

describe('contract renewal eligibility', () => {
  it('allows renew from active and completed lifecycle states', () => {
    expect(RENEWABLE_CONTRACT_STATUSES).toEqual(
      expect.arrayContaining([
        'active',
        'awaiting_assets',
        'closed',
        'concluded',
      ]),
    );
    expect(RENEWABLE_CONTRACT_STATUSES).not.toContain('draft');
  });
});
