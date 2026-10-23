import {
  buildFleetReturnListNextSteps,
  type FleetReturnListNextStepInput,
} from './fleet-return-list-next-step.util';

function base(
  overrides: Partial<FleetReturnListNextStepInput>,
): FleetReturnListNextStepInput {
  return {
    vehicleStatus: 'return_pending',
    inspectionStatus: 'not_started',
    expectedReturnDueDate: null,
    registeredReturn: false,
    ...overrides,
  };
}

describe('buildFleetReturnListNextSteps', () => {
  it('returns Remind (disabled) + Receive for overdue return_pending', () => {
    const steps = buildFleetReturnListNextSteps(
      base({
        expectedReturnDueDate: '2020-01-01',
      }),
    );
    expect(steps.map((s) => s.actionKey)).toEqual(['remind_client', 'receive']);
    expect(steps[0]?.enabled).toBe(false);
    expect(steps[0]?.variant).toBe('ghost');
    expect(steps[1]?.enabled).toBe(true);
  });

  it('returns Receive only for non-overdue return_pending', () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 14);
    const iso = future.toISOString().slice(0, 10);
    const steps = buildFleetReturnListNextSteps(
      base({ expectedReturnDueDate: iso }),
    );
    expect(steps).toEqual([
      expect.objectContaining({
        actionKey: 'receive',
        label: 'Receive',
        variant: 'secondary',
        enabled: true,
      }),
    ]);
  });

  it('returns Start Inspection for returned + not_started', () => {
    const steps = buildFleetReturnListNextSteps(
      base({
        vehicleStatus: 'returned',
        inspectionStatus: 'not_started',
      }),
    );
    expect(steps[0]).toMatchObject({
      actionKey: 'start_inspection',
      variant: 'primary',
      enabled: true,
    });
  });

  it('returns View result only when inspection completed on returned', () => {
    const steps = buildFleetReturnListNextSteps(
      base({
        vehicleStatus: 'returned',
        inspectionStatus: 'completed',
      }),
    );
    expect(steps).toEqual([
      expect.objectContaining({
        actionKey: 'view_inspection_result',
        variant: 'primary',
        enabled: true,
      }),
    ]);
  });

  it('returns Continue for returned + in_progress', () => {
    const steps = buildFleetReturnListNextSteps(
      base({
        vehicleStatus: 'returned',
        inspectionStatus: 'in_progress',
      }),
    );
    expect(steps[0]).toMatchObject({
      actionKey: 'continue_inspection',
      enabled: true,
    });
  });

  it('returns Finalize for returned + ready_to_finalize', () => {
    const steps = buildFleetReturnListNextSteps(
      base({
        vehicleStatus: 'returned',
        inspectionStatus: 'ready_to_finalize',
      }),
    );
    expect(steps[0]).toMatchObject({
      actionKey: 'finalize_inspection',
      variant: 'primary',
      enabled: true,
    });
  });

  it('disables Receive when already registered at gate', () => {
    const steps = buildFleetReturnListNextSteps(
      base({ registeredReturn: true }),
    );
    expect(steps).toEqual([
      expect.objectContaining({
        actionKey: 'receive',
        enabled: false,
        reasonDisabled: 'Vehicle was already received at gate',
      }),
    ]);
  });

  it('returns Re-inspect primary when workshop repair is closed', () => {
    const steps = buildFleetReturnListNextSteps(
      base({
        vehicleStatus: 'workshop',
        inspectionStatus: 'completed',
        workshopRepairClosed: true,
        workshopJobId: '11111111-1111-4111-8111-111111111111',
      }),
    );
    expect(steps[0]).toMatchObject({
      actionKey: 'reinspect',
      variant: 'primary',
      enabled: true,
    });
    expect(steps[1]).toMatchObject({
      actionKey: 'view_inspection_result',
      enabled: true,
    });
    expect(steps[2]).toMatchObject({
      actionKey: 'view_job',
      enabled: true,
    });
  });

  it('returns View result + View job when workshop and repair not closed', () => {
    const steps = buildFleetReturnListNextSteps(
      base({
        vehicleStatus: 'workshop',
        inspectionStatus: 'completed',
        workshopJobId: '11111111-1111-4111-8111-111111111111',
      }),
    );
    expect(steps[0]).toMatchObject({
      actionKey: 'view_inspection_result',
      enabled: true,
    });
    expect(steps[1]).toMatchObject({
      actionKey: 'view_job',
      enabled: true,
      workshopJobId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('returns Resolve hold (enabled) when returnOnHold', () => {
    const steps = buildFleetReturnListNextSteps(base({ returnOnHold: true }));
    expect(steps[0]).toMatchObject({
      actionKey: 'resolve_hold',
      enabled: true,
    });
    expect(steps[1]).toMatchObject({
      actionKey: 'view_inspection_result',
      enabled: true,
    });
  });
});
