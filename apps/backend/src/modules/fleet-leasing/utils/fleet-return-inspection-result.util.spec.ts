import {
  buildEmptyWorksheet,
  type FleetReturnInspectionWorksheet,
} from '../constants/fleet-return-inspection-sections.constants';
import {
  buildFleetReturnInspectionResult,
  buildFleetReturnInspectionResultStatusBanner,
  enrichFleetReturnInspectionResult,
  FLEET_RETURN_EXCESS_KM_RATE_MINOR,
} from './fleet-return-inspection-result.util';

const inspectionId = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
const completedAt = new Date('2026-10-31T11:35:00.000Z');

function worksheetWithMajorBumper(): FleetReturnInspectionWorksheet {
  const ws = buildEmptyWorksheet();
  for (const section of Object.values(ws.sections)) {
    for (const key of Object.keys(section)) {
      section[key] = { rating: 'pass' };
    }
  }
  ws.sections.exterior_body!.front_bumper = {
    rating: 'major',
    attribution: 'client_damage',
    repairCostMinor: 1_850_00,
  };
  return ws;
}

describe('buildFleetReturnInspectionResult', () => {
  it('builds workshop outcome with recovery lines and job tasks', () => {
    const worksheet = worksheetWithMajorBumper();
    const result = buildFleetReturnInspectionResult({
      inspectionId,
      inspectionCreatedAt: new Date('2026-10-24T00:00:00.000Z'),
      inspectionCompletedAt: completedAt,
      receivedAt: new Date('2026-10-31T10:40:00.000Z'),
      odometerReading: 64_540,
      fleetCode: 'FL-0207',
      registrationNo: 'HR 26 AA 2207',
      clientName: "Domino's",
      contractNumber: 'LC-2025-0047',
      contractStatus: 'closed',
      contractClosingReason: 'completed',
      contractEndDate: new Date('2026-10-24T00:00:00.000Z'),
      contractExpectedReturnBy: null,
      depotLabel: 'Gurugram depot',
      vehicleStatus: 'workshop',
      workshopJobId: null,
      worksheet,
      summary: {
        majorCount: 1,
        minorCount: 0,
        missingCount: 0,
        excessKm: 3_420,
        repairEstimateMinor: 1_850_00,
      },
    });

    expect(result.outcome).toBe('sent_to_workshop');
    expect(result.jobCard?.tasks.length).toBeGreaterThanOrEqual(1);
    expect(result.recoveryNote.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Client damage',
          amountMinor: 1_850_00,
        }),
      ]),
    );
    const excessKmLine = result.recoveryNote.lines.find((line) =>
      line.label.includes('Excess km'),
    );
    expect(excessKmLine?.amountMinor).toBe(
      3_420 * FLEET_RETURN_EXCESS_KM_RATE_MINOR,
    );
    expect(result.timeline.some((t) => t.state === 'active')).toBe(true);
    expect(
      result.availableActions.some((a) => a.actionKey === 'next_to_inspect'),
    ).toBe(true);
    const openWorkshop = result.availableActions.find(
      (a) => a.actionKey === 'open_workshop',
    );
    expect(openWorkshop?.enabled).toBe(false);
  });

  it('enables open_workshop when workshopJobId is present', () => {
    const worksheet = worksheetWithMajorBumper();
    const workshopJobId = '11111111-1111-4111-8111-111111111111';
    const result = buildFleetReturnInspectionResult({
      inspectionId,
      inspectionCreatedAt: new Date('2026-10-24T00:00:00.000Z'),
      inspectionCompletedAt: completedAt,
      receivedAt: new Date('2026-10-31T10:40:00.000Z'),
      odometerReading: 64_540,
      fleetCode: 'FL-0207',
      registrationNo: 'HR 26 AA 2207',
      clientName: "Domino's",
      contractNumber: 'LC-2025-0047',
      contractStatus: 'closed',
      contractClosingReason: 'completed',
      contractEndDate: new Date('2026-10-24T00:00:00.000Z'),
      contractExpectedReturnBy: null,
      depotLabel: 'Gurugram depot',
      vehicleStatus: 'workshop',
      workshopJobId,
      worksheet,
      summary: {
        majorCount: 1,
        minorCount: 0,
        missingCount: 0,
        excessKm: 0,
        repairEstimateMinor: 1_850_00,
      },
    });
    const openWorkshop = result.availableActions.find(
      (a) => a.actionKey === 'open_workshop',
    );
    expect(openWorkshop?.enabled).toBe(true);
    expect(openWorkshop?.workshopJobId).toBe(workshopJobId);
    expect(result.jobCard?.workshopJobId).toBe(workshopJobId);
  });

  it('does not create a job card when disposition is ready_to_lease despite major damage', () => {
    const worksheet = worksheetWithMajorBumper();
    const result = buildFleetReturnInspectionResult({
      inspectionId,
      inspectionCreatedAt: new Date('2026-10-24T00:00:00.000Z'),
      inspectionCompletedAt: completedAt,
      receivedAt: new Date('2026-10-31T10:40:00.000Z'),
      odometerReading: 64_540,
      fleetCode: 'FL-0207',
      registrationNo: 'HR 26 AA 2207',
      clientName: "Domino's",
      contractNumber: 'LC-2025-0047',
      contractStatus: 'closed',
      contractClosingReason: 'completed',
      contractEndDate: new Date('2026-10-24T00:00:00.000Z'),
      contractExpectedReturnBy: null,
      depotLabel: 'Gurugram depot',
      vehicleStatus: 'available',
      workshopJobId: null,
      worksheet,
      summary: {
        majorCount: 1,
        minorCount: 0,
        missingCount: 0,
        excessKm: 0,
        repairEstimateMinor: 1_850_00,
      },
      finalize: {
        disposition: 'ready_to_lease',
        issueCharges: {},
        waiveAllRecovery: false,
        inspectorConfirmed: true,
      },
    });

    expect(result.outcome).toBe('ready_to_lease');
    expect(result.jobCard).toBeNull();
  });

  it('builds ready_to_lease outcome without job card', () => {
    const worksheet = buildEmptyWorksheet();
    for (const section of Object.values(worksheet.sections)) {
      for (const key of Object.keys(section)) {
        section[key] = { rating: 'pass' };
      }
    }
    const result = buildFleetReturnInspectionResult({
      inspectionId,
      inspectionCreatedAt: new Date('2026-10-24T00:00:00.000Z'),
      inspectionCompletedAt: completedAt,
      receivedAt: new Date('2026-10-31T10:40:00.000Z'),
      odometerReading: 64_540,
      fleetCode: 'FL-0207',
      registrationNo: 'HR 26 AA 2207',
      clientName: "Domino's",
      contractNumber: 'LC-2025-0047',
      contractStatus: 'closed',
      contractClosingReason: 'completed',
      contractEndDate: new Date('2026-10-24T00:00:00.000Z'),
      contractExpectedReturnBy: null,
      depotLabel: 'Gurugram depot',
      vehicleStatus: 'available',
      workshopJobId: null,
      worksheet,
      summary: {
        majorCount: 0,
        minorCount: 0,
        missingCount: 0,
        excessKm: 0,
        repairEstimateMinor: 0,
      },
    });

    expect(result.outcome).toBe('ready_to_lease');
    expect(result.jobCard).toBeNull();
    expect(result.timeline.at(-1)?.state).toBe('done');
  });

  it('uses workshop auto-sync banner copy without manual job-card instructions', () => {
    const result = buildFleetReturnInspectionResult({
      inspectionId,
      inspectionCreatedAt: new Date('2026-10-24T00:00:00.000Z'),
      inspectionCompletedAt: completedAt,
      receivedAt: new Date('2026-10-31T10:40:00.000Z'),
      odometerReading: 64_540,
      fleetCode: 'VH-2375',
      registrationNo: 'HR 26 AA 2375',
      clientName: "Domino's",
      contractNumber: 'LC-2025-0047',
      contractStatus: 'closed',
      contractClosingReason: 'completed',
      contractEndDate: new Date('2026-10-24T00:00:00.000Z'),
      contractExpectedReturnBy: null,
      depotLabel: 'Gurugram depot',
      vehicleStatus: 'workshop',
      workshopJobId: '11111111-1111-4111-8111-111111111111',
      workshopJobDisplayNumber: 'WO-2026-0142',
      worksheet: worksheetWithMajorBumper(),
      summary: {
        majorCount: 1,
        minorCount: 0,
        missingCount: 0,
        excessKm: 0,
        repairEstimateMinor: 1_850_00,
      },
    });

    expect(result.statusBanner?.level).toBe('info');
    expect(result.statusBanner?.message).toContain('VH-2375');
    expect(result.statusBanner?.message).toContain('WO-2026-0142');
    expect(result.statusBanner?.message).toContain('Workshop');
    expect(result.statusBanner?.message).not.toContain(
      'When the job card is closed',
    );
  });
});

describe('buildFleetReturnInspectionResultStatusBanner', () => {
  it('reflects repair complete after workshop sync', () => {
    const banner = buildFleetReturnInspectionResultStatusBanner({
      fleetLabel: 'VH-2375',
      outcome: 'sent_to_workshop',
      workshopRepairClosedAt: new Date('2026-11-02T00:00:00.000Z'),
      workshopJobId: '11111111-1111-4111-8111-111111111111',
      workshopWorkOrderNumber: 'WO-2026-0142',
      jobCardDisplayNumber: 'WO-2026-0142',
      jobCardStatus: 'closed',
    });
    expect(banner?.message).toContain('Repair done');
    expect(banner?.level).toBe('info');
  });
});

describe('enrichFleetReturnInspectionResult', () => {
  it('rebuilds workshop banner on read with live work order number', () => {
    const base = buildFleetReturnInspectionResult({
      inspectionId,
      inspectionCreatedAt: new Date('2026-10-24T00:00:00.000Z'),
      inspectionCompletedAt: completedAt,
      receivedAt: new Date('2026-10-31T10:40:00.000Z'),
      odometerReading: 64_540,
      fleetCode: 'VH-2375',
      registrationNo: 'HR 26 AA 2375',
      clientName: "Domino's",
      contractNumber: 'LC-2025-0047',
      contractStatus: 'closed',
      contractClosingReason: 'completed',
      contractEndDate: new Date('2026-10-24T00:00:00.000Z'),
      contractExpectedReturnBy: null,
      depotLabel: 'Gurugram depot',
      vehicleStatus: 'workshop',
      workshopJobId: null,
      worksheet: worksheetWithMajorBumper(),
      summary: {
        majorCount: 1,
        minorCount: 0,
        missingCount: 0,
        excessKm: 0,
        repairEstimateMinor: 1_850_00,
      },
    });

    const enriched = enrichFleetReturnInspectionResult(base, {
      fleetLabel: 'VH-2375',
      assetClassName: 'Scooter 150cc',
      assetClassId: null,
      assetRegisterVehicleId: null,
      vehicleStatus: 'workshop',
      contractsWaitingForAssetClass: 0,
      contractClosingProgress: null,
      reInspectionCompletedAt: null,
      workshopRepairClosedAt: null,
      workshopJobId: '11111111-1111-4111-8111-111111111111',
      workshopWorkOrderNumber: 'WO-2026-0999',
      reInspectorDisplayName: null,
      contractStatus: 'closed',
      contractClosingReason: 'completed',
      inspectionCompletedAt: completedAt,
      receivedAt: new Date('2026-10-31T10:40:00.000Z'),
      odometerReading: 64_540,
      depotLabel: 'Gurugram depot',
      contractExpectedReturnBy: null,
      contractEndDate: new Date('2026-10-24T00:00:00.000Z'),
      inspectionCreatedAt: new Date('2026-10-24T00:00:00.000Z'),
    });

    expect(enriched.statusBanner?.message).toContain('WO-2026-0999');
    expect(enriched.jobCard?.displayNumber).toBe('WO-2026-0999');
  });

  it('enables vehicle_history when asset register vehicle is linked', () => {
    const base = buildFleetReturnInspectionResult({
      inspectionId,
      inspectionCreatedAt: new Date('2026-10-24T00:00:00.000Z'),
      inspectionCompletedAt: completedAt,
      receivedAt: new Date('2026-10-31T10:40:00.000Z'),
      odometerReading: 64_540,
      fleetCode: 'VH-2375',
      registrationNo: 'HR 26 AA 2375',
      clientName: "Domino's",
      contractNumber: 'LC-2025-0047',
      contractStatus: 'closed',
      contractClosingReason: 'completed',
      contractEndDate: new Date('2026-10-24T00:00:00.000Z'),
      contractExpectedReturnBy: null,
      depotLabel: 'Gurugram depot',
      vehicleStatus: 'available',
      workshopJobId: null,
      worksheet: worksheetWithMajorBumper(),
      summary: {
        majorCount: 0,
        minorCount: 0,
        missingCount: 0,
        excessKm: 0,
        repairEstimateMinor: 0,
      },
    });
    base.outcome = 'ready_to_lease';

    const assetRegisterVehicleId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const enriched = enrichFleetReturnInspectionResult(base, {
      fleetLabel: 'VH-2375',
      assetClassName: 'Scooter 150cc',
      assetClassId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      assetRegisterVehicleId,
      vehicleStatus: 'available',
      contractsWaitingForAssetClass: 2,
      contractClosingProgress: null,
      reInspectionCompletedAt: completedAt,
      workshopRepairClosedAt: completedAt,
      workshopJobId: null,
      workshopWorkOrderNumber: null,
      reInspectorDisplayName: 'Inspector A',
      contractStatus: 'closed',
      contractClosingReason: 'completed',
      inspectionCompletedAt: completedAt,
      receivedAt: new Date('2026-10-31T10:40:00.000Z'),
      odometerReading: 64_540,
      depotLabel: 'Gurugram depot',
      contractExpectedReturnBy: null,
      contractEndDate: new Date('2026-10-24T00:00:00.000Z'),
      inspectionCreatedAt: new Date('2026-10-24T00:00:00.000Z'),
    });

    const history = enriched.availableActions.find(
      (a) => a.actionKey === 'vehicle_history',
    );
    expect(history?.enabled).toBe(true);
    expect(history?.assetRegisterVehicleId).toBe(assetRegisterVehicleId);
    expect(history?.reasonDisabled).toBeUndefined();

    const assign = enriched.availableActions.find(
      (a) => a.actionKey === 'assign_contract',
    );
    expect(assign?.enabled).toBe(true);
    expect(assign?.assetRegisterVehicleId).toBe(assetRegisterVehicleId);
    expect(assign?.reasonDisabled).toBeUndefined();
  });

  it('keeps assign and history disabled without fleet register link', () => {
    const base = buildFleetReturnInspectionResult({
      inspectionId,
      inspectionCreatedAt: new Date('2026-10-24T00:00:00.000Z'),
      inspectionCompletedAt: completedAt,
      receivedAt: new Date('2026-10-31T10:40:00.000Z'),
      odometerReading: 64_540,
      fleetCode: 'VH-2375',
      registrationNo: 'HR 26 AA 2375',
      clientName: "Domino's",
      contractNumber: 'LC-2025-0047',
      contractStatus: 'closed',
      contractClosingReason: 'completed',
      contractEndDate: new Date('2026-10-24T00:00:00.000Z'),
      contractExpectedReturnBy: null,
      depotLabel: 'Gurugram depot',
      vehicleStatus: 'available',
      workshopJobId: null,
      worksheet: buildEmptyWorksheet(),
      summary: {
        majorCount: 0,
        minorCount: 0,
        missingCount: 0,
        excessKm: 0,
        repairEstimateMinor: 0,
      },
    });

    const enriched = enrichFleetReturnInspectionResult(base, {
      fleetLabel: 'VH-2375',
      assetClassName: 'Scooter 150cc',
      assetClassId: null,
      assetRegisterVehicleId: null,
      vehicleStatus: 'available',
      contractsWaitingForAssetClass: 0,
      contractClosingProgress: null,
      reInspectionCompletedAt: null,
      workshopRepairClosedAt: null,
      workshopJobId: null,
      workshopWorkOrderNumber: null,
      reInspectorDisplayName: null,
      contractStatus: 'closed',
      contractClosingReason: 'completed',
      inspectionCompletedAt: completedAt,
      receivedAt: new Date('2026-10-31T10:40:00.000Z'),
      odometerReading: 64_540,
      depotLabel: 'Gurugram depot',
      contractExpectedReturnBy: null,
      contractEndDate: new Date('2026-10-24T00:00:00.000Z'),
      inspectionCreatedAt: new Date('2026-10-24T00:00:00.000Z'),
    });

    const assign = enriched.availableActions.find(
      (a) => a.actionKey === 'assign_contract',
    );
    const history = enriched.availableActions.find(
      (a) => a.actionKey === 'vehicle_history',
    );
    expect(assign?.enabled).toBe(false);
    expect(history?.enabled).toBe(false);
    expect(assign?.reasonDisabled).toContain('Fleet register');
    expect(history?.reasonDisabled).toContain('Fleet register');
  });
});
