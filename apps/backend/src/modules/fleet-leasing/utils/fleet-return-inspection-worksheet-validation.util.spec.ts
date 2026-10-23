import { buildEmptyWorksheet } from '../constants/fleet-return-inspection-sections.constants';
import {
  collectInspectionWorksheetValidationIssues,
  inspectionDamageLineIsComplete,
} from './fleet-return-inspection-worksheet-validation.util';

describe('fleet-return-inspection-worksheet-validation', () => {
  it('requires note and repair estimate for minor/major damage lines', () => {
    const worksheet = buildEmptyWorksheet();
    worksheet.sections.exterior_body!.front_bumper = {
      rating: 'major',
      attribution: 'client_damage',
      repairCostMinor: 1_000_00,
    };
    const issues = collectInspectionWorksheetValidationIssues(worksheet);
    expect(issues.some((i) => i.field === 'note')).toBe(true);
    expect(
      inspectionDamageLineIsComplete(
        worksheet.sections.exterior_body!.front_bumper,
      ),
    ).toBe(false);

    worksheet.sections.exterior_body!.front_bumper = {
      rating: 'major',
      attribution: 'client_damage',
      note: 'Cracked bumper',
      repairCostMinor: 1_000_00,
    };
    expect(
      inspectionDamageLineIsComplete(
        worksheet.sections.exterior_body!.front_bumper,
      ),
    ).toBe(true);
  });

  it('requires note but not repair cost when attribution is missing', () => {
    const worksheet = buildEmptyWorksheet();
    worksheet.sections.documents_keys!.keys_set = {
      rating: 'major',
      attribution: 'missing',
    };
    expect(
      inspectionDamageLineIsComplete(
        worksheet.sections.documents_keys!.keys_set,
      ),
    ).toBe(false);

    worksheet.sections.documents_keys!.keys_set = {
      rating: 'major',
      attribution: 'missing',
      note: 'One key missing from set',
    };
    expect(
      inspectionDamageLineIsComplete(
        worksheet.sections.documents_keys!.keys_set,
      ),
    ).toBe(true);
  });
});
