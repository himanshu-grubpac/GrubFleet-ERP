import {
  buildEmptyWorksheet,
  computeInspectionSummary,
} from './fleet-return-inspection-sections.constants';

describe('computeInspectionSummary', () => {
  it('counts ratings, missing attribution, repair costs, and excess km', () => {
    const worksheet = buildEmptyWorksheet();
    worksheet.sections.exterior_body!.front_bumper = {
      rating: 'major',
      attribution: 'client_damage',
      repairCostMinor: 12_000_00,
    };
    worksheet.sections.exterior_body!.left_rear_door = {
      rating: 'minor',
      attribution: 'client_damage',
      repairCostMinor: 4_500_00,
    };
    worksheet.sections.documents_keys!.keys_set = {
      rating: 'major',
      attribution: 'missing',
      note: 'One key missing from the set',
    };

    const summary = computeInspectionSummary(worksheet, {
      odometerReading: 64_540,
      handoverOdometer: 61_120,
      leaseKmAllowance: 0,
    });

    expect(summary.majorCount).toBe(2);
    expect(summary.minorCount).toBe(1);
    expect(summary.missingCount).toBe(1);
    expect(summary.excessKm).toBe(3_420);
    expect(summary.repairEstimateMinor).toBe(16_500_00);
  });
});
