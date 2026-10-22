import { buildBulkAssignVehicleValidationRow } from './bulk-assign-validate.util';

describe('buildBulkAssignVehicleValidationRow', () => {
  const baseVehicle = {
    id: 'v1',
    fleetCode: 'FL-1001',
    isActive: true,
    operationalStatus: 'available' as const,
    assetClass: { name: 'Sedan' },
  };

  it('marks inactive vehicles', () => {
    const row = buildBulkAssignVehicleValidationRow({
      vehicle: { ...baseVehicle, isActive: false } as never,
      hasActiveAssignment: false,
      assignmentConflictLabel: null,
      assetClassAllowed: true,
    });
    expect(row.available).toBe(false);
    expect(row.reason).toBe('inactive');
  });

  it('marks workshop and assigned elsewhere', () => {
    const workshop = buildBulkAssignVehicleValidationRow({
      vehicle: {
        ...baseVehicle,
        operationalStatus: 'workshop',
      } as never,
      hasActiveAssignment: false,
      assignmentConflictLabel: null,
      assetClassAllowed: true,
    });
    expect(workshop.reason).toBe('in_workshop');

    const assigned = buildBulkAssignVehicleValidationRow({
      vehicle: baseVehicle as never,
      hasActiveAssignment: true,
      assignmentConflictLabel: 'Acme Corp',
      assetClassAllowed: true,
    });
    expect(assigned.reason).toBe('assigned_elsewhere');
    expect(assigned.conflictLabel).toBe('Acme Corp');
  });
});
