export type VehicleAllocationBlockReason =
  | 'CONTRACT_STATUS'
  | 'VEHICLE_NOT_FOUND'
  | 'VEHICLE_UNAVAILABLE'
  | 'REASSIGNMENT_CONFIRMATION_REQUIRED'
  | 'ALREADY_ON_CONTRACT';

export type VehicleAllocationPrecheck = {
  allowed: boolean;
  reason?: VehicleAllocationBlockReason;
  message?: string;
  requiresReassignmentConfirmation: boolean;
  otherContractId?: string;
};

export function evaluateVehicleAllocation(input: {
  contractStatus: string;
  eligibleStatuses: readonly string[];
  vehicleStatus: string;
  vehicleOnOtherContract: boolean;
  otherContractId?: string;
  alreadyOnTargetContract: boolean;
  reassignmentConfirmation?: string;
}): VehicleAllocationPrecheck {
  if (!input.eligibleStatuses.includes(input.contractStatus)) {
    return {
      allowed: false,
      reason: 'CONTRACT_STATUS',
      message: 'Contract is not eligible for vehicle allocation',
      requiresReassignmentConfirmation: false,
    };
  }
  if (input.alreadyOnTargetContract) {
    return {
      allowed: false,
      reason: 'ALREADY_ON_CONTRACT',
      message: 'Vehicle is already allocated to this contract',
      requiresReassignmentConfirmation: false,
    };
  }
  const requiresReassignmentConfirmation = input.vehicleOnOtherContract;
  if (requiresReassignmentConfirmation) {
    const text = input.reassignmentConfirmation?.trim();
    if (!text) {
      return {
        allowed: false,
        reason: 'REASSIGNMENT_CONFIRMATION_REQUIRED',
        message:
          'Reassignment confirmation is required when moving a vehicle from another contract',
        requiresReassignmentConfirmation: true,
        otherContractId: input.otherContractId,
      };
    }
  } else if (input.vehicleStatus !== 'available') {
    return {
      allowed: false,
      reason: 'VEHICLE_UNAVAILABLE',
      message: 'Vehicle must be available unless reassigning from another contract',
      requiresReassignmentConfirmation: false,
    };
  }
  return {
    allowed: true,
    requiresReassignmentConfirmation,
    otherContractId: input.otherContractId,
  };
}
