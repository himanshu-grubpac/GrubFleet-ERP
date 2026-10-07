import {
  isContractEditable,
  getContractEditBlockReason,
} from './contract-edit.util';

describe('contract-edit.util', () => {
  it('allows edit on active and other non-terminal editable statuses', () => {
    expect(isContractEditable('active')).toBe(true);
    expect(isContractEditable('awaiting_assets')).toBe(true);
    expect(getContractEditBlockReason('active')).toBeNull();
  });

  it('blocks edit on deactivated and billing paused (rule 31)', () => {
    expect(isContractEditable('deactivated')).toBe(false);
    expect(isContractEditable('billing_paused')).toBe(false);
    expect(getContractEditBlockReason('deactivated')).toMatch(
      /cannot be edited until reactivated/i,
    );
  });

  it('blocks edit on closed and concluded', () => {
    expect(isContractEditable('closed')).toBe(false);
    expect(isContractEditable('concluded')).toBe(false);
    expect(getContractEditBlockReason('closed')).toMatch(/closed contract/i);
  });

  it('blocks edit while termination is pending', () => {
    expect(isContractEditable('pending_termination')).toBe(false);
    expect(getContractEditBlockReason('pending_termination')).toMatch(
      /cannot be edited/i,
    );
  });
});
