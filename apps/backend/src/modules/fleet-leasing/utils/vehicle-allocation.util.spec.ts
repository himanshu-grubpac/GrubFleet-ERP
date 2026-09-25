import { evaluateVehicleAllocation } from './vehicle-allocation.util';

const eligible = ['active', 'awaiting_assets'] as const;

describe('vehicle-allocation.util', () => {
  it('requires reassignment confirmation when vehicle on another contract', () => {
    const result = evaluateVehicleAllocation({
      contractStatus: 'active',
      eligibleStatuses: eligible,
      vehicleStatus: 'leased',
      vehicleOnOtherContract: true,
      otherContractId: 'other',
      alreadyOnTargetContract: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('REASSIGNMENT_CONFIRMATION_REQUIRED');
  });

  it('allows reassignment with confirmation text', () => {
    const result = evaluateVehicleAllocation({
      contractStatus: 'active',
      eligibleStatuses: eligible,
      vehicleStatus: 'leased',
      vehicleOnOtherContract: true,
      otherContractId: 'other',
      alreadyOnTargetContract: false,
      reassignmentConfirmation: 'Client approved move',
    });
    expect(result.allowed).toBe(true);
    expect(result.requiresReassignmentConfirmation).toBe(true);
  });

  it('allows available vehicle without confirmation', () => {
    const result = evaluateVehicleAllocation({
      contractStatus: 'active',
      eligibleStatuses: eligible,
      vehicleStatus: 'available',
      vehicleOnOtherContract: false,
      alreadyOnTargetContract: false,
    });
    expect(result.allowed).toBe(true);
  });
});
