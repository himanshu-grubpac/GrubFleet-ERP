import type { AssetRegisterVehicleWithRelations } from '../repositories/asset-register.repository';

export type BulkAssignVehicleConflictReason =
  | 'assigned_elsewhere'
  | 'in_workshop'
  | 'inactive'
  | 'not_available'
  | 'wrong_asset_class';

export type BulkAssignVehicleValidationRow = {
  vehicleId: string;
  fleetCode: string;
  available: boolean;
  reason?: BulkAssignVehicleConflictReason;
  conflictLabel?: string | null;
};

export function mapOperationalStatusToConflictReason(
  operationalStatus: string,
): BulkAssignVehicleConflictReason {
  if (operationalStatus === 'workshop') {
    return 'in_workshop';
  }
  return 'not_available';
}

export function buildBulkAssignVehicleValidationRow(input: {
  vehicle: AssetRegisterVehicleWithRelations;
  hasActiveAssignment: boolean;
  assignmentConflictLabel: string | null;
  assetClassAllowed: boolean;
}): BulkAssignVehicleValidationRow {
  const { vehicle, hasActiveAssignment, assignmentConflictLabel, assetClassAllowed } =
    input;

  if (!vehicle.isActive) {
    return {
      vehicleId: vehicle.id,
      fleetCode: vehicle.fleetCode,
      available: false,
      reason: 'inactive',
    };
  }

  if (hasActiveAssignment) {
    return {
      vehicleId: vehicle.id,
      fleetCode: vehicle.fleetCode,
      available: false,
      reason: 'assigned_elsewhere',
      conflictLabel: assignmentConflictLabel,
    };
  }

  if (vehicle.operationalStatus === 'workshop') {
    return {
      vehicleId: vehicle.id,
      fleetCode: vehicle.fleetCode,
      available: false,
      reason: 'in_workshop',
    };
  }

  if (vehicle.operationalStatus !== 'available') {
    return {
      vehicleId: vehicle.id,
      fleetCode: vehicle.fleetCode,
      available: false,
      reason: mapOperationalStatusToConflictReason(vehicle.operationalStatus),
    };
  }

  if (!assetClassAllowed) {
    return {
      vehicleId: vehicle.id,
      fleetCode: vehicle.fleetCode,
      available: false,
      reason: 'wrong_asset_class',
    };
  }

  return {
    vehicleId: vehicle.id,
    fleetCode: vehicle.fleetCode,
    available: true,
  };
}
