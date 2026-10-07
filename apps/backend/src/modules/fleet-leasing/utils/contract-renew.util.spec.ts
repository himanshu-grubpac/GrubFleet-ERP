import { RENEWABLE_CONTRACT_STATUSES } from '../constants/lease-contract-status';
import {
  classifyRenewOutcomeKind,
  findLatestRenewOutcomeEvent,
  RENEWAL_TERM_THRESHOLD_MONTHS,
} from './contract-renew.util';

describe('contract renewal eligibility', () => {
  it('allows renew from active lifecycle state only', () => {
    expect(RENEWABLE_CONTRACT_STATUSES).toEqual(['active']);
  });

  it('does not include draft or closed statuses', () => {
    expect(RENEWABLE_CONTRACT_STATUSES).not.toContain('draft');
    expect(RENEWABLE_CONTRACT_STATUSES).not.toContain('closed');
  });
});

describe('classifyRenewOutcomeKind', () => {
  it('treats 12+ months as renewal', () => {
    expect(classifyRenewOutcomeKind(RENEWAL_TERM_THRESHOLD_MONTHS)).toBe(
      'renewal',
    );
    expect(classifyRenewOutcomeKind(24)).toBe('renewal');
  });

  it('treats under 12 months as extension', () => {
    expect(classifyRenewOutcomeKind(6)).toBe('extension');
    expect(classifyRenewOutcomeKind(11)).toBe('extension');
  });
});

describe('findLatestRenewOutcomeEvent', () => {
  it('returns the newest renew outcome when events are newest-first', () => {
    const older = new Date('2026-01-01T00:00:00.000Z');
    const newer = new Date('2026-06-01T00:00:00.000Z');
    const result = findLatestRenewOutcomeEvent([
      { eventType: 'contract.extended', createdAt: newer },
      { eventType: 'contract.renewed', createdAt: older },
    ]);
    expect(result?.kind).toBe('extension');
    expect(result?.occurredAt).toEqual(newer);
  });
});
