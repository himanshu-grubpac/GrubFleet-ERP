import {
  FLEET_RETURN_INSPECTION_SECTION_CATALOG,
  type FleetReturnInspectionLineItemState,
  type FleetReturnInspectionSectionCatalog,
  type FleetReturnInspectionWorksheet,
} from '../constants/fleet-return-inspection-sections.constants';

export const FLEET_RETURN_INSPECTION_LINE_NOTE_MAX = 500;
export const FLEET_RETURN_INSPECTION_REPAIR_COST_MINOR_MAX = 999_999_999;

export type FleetReturnInspectionLineValidationField =
  'rating' | 'attribution' | 'note' | 'repairCost';

export type FleetReturnInspectionLineValidationIssue = {
  sectionId: string;
  itemKey: string;
  field: FleetReturnInspectionLineValidationField;
  message: string;
};

function validateDamageRatedLine(
  row: FleetReturnInspectionLineItemState,
): FleetReturnInspectionLineValidationIssue['field'][] {
  const missing: FleetReturnInspectionLineValidationIssue['field'][] = [];
  if (!row.attribution) {
    missing.push('attribution');
    return missing;
  }
  const noteTrim = row.note?.trim() ?? '';
  if (!noteTrim) {
    missing.push('note');
  } else if (noteTrim.length > FLEET_RETURN_INSPECTION_LINE_NOTE_MAX) {
    missing.push('note');
  }
  if (row.attribution !== 'missing') {
    if (
      row.repairCostMinor == null ||
      row.repairCostMinor <= 0 ||
      row.repairCostMinor > FLEET_RETURN_INSPECTION_REPAIR_COST_MINOR_MAX
    ) {
      missing.push('repairCost');
    }
  } else if (
    row.repairCostMinor != null &&
    row.repairCostMinor > FLEET_RETURN_INSPECTION_REPAIR_COST_MINOR_MAX
  ) {
    missing.push('repairCost');
  }
  return missing;
}

export function messageForInspectionLineField(
  field: FleetReturnInspectionLineValidationField,
  row: FleetReturnInspectionLineItemState,
): string {
  switch (field) {
    case 'rating':
      return 'Rate every item before continuing.';
    case 'attribution':
      return 'Select attribution for this item.';
    case 'note': {
      const noteTrim = row.note?.trim() ?? '';
      if (!noteTrim) {
        return 'Describe the damage or missing item.';
      }
      return 'Note is too long.';
    }
    case 'repairCost': {
      if (row.repairCostMinor == null || row.repairCostMinor <= 0) {
        return 'Enter a repair estimate greater than zero.';
      }
      return 'Repair estimate exceeds the allowed maximum.';
    }
    default:
      return 'Complete this line before continuing.';
  }
}

export function collectInspectionWorksheetValidationIssues(
  worksheet: FleetReturnInspectionWorksheet,
  opts?: {
    sectionId?: string;
    requireAllRated?: boolean;
  },
): FleetReturnInspectionLineValidationIssue[] {
  const issues: FleetReturnInspectionLineValidationIssue[] = [];
  const sections: FleetReturnInspectionSectionCatalog[] =
    opts?.sectionId != null
      ? FLEET_RETURN_INSPECTION_SECTION_CATALOG.filter(
          (s) => s.id === opts.sectionId,
        )
      : FLEET_RETURN_INSPECTION_SECTION_CATALOG;

  for (const section of sections) {
    const items = worksheet.sections[section.id] ?? {};
    for (const item of section.items) {
      const row = items[item.key];
      if (!row || row.rating === 'unchecked') {
        if (opts?.requireAllRated) {
          issues.push({
            sectionId: section.id,
            itemKey: item.key,
            field: 'rating',
            message: messageForInspectionLineField('rating', {
              rating: 'unchecked',
            }),
          });
        }
        continue;
      }
      if (row.rating === 'pass') continue;
      if (row.rating !== 'minor' && row.rating !== 'major') continue;

      for (const field of validateDamageRatedLine(row)) {
        issues.push({
          sectionId: section.id,
          itemKey: item.key,
          field,
          message: messageForInspectionLineField(field, row),
        });
      }
    }
  }
  return issues;
}

export function inspectionDamageLineIsComplete(
  row: FleetReturnInspectionLineItemState,
): boolean {
  if (row.rating === 'pass') return true;
  if (row.rating !== 'minor' && row.rating !== 'major') return false;
  return validateDamageRatedLine(row).length === 0;
}

export function firstInspectionWorksheetValidationMessage(
  worksheet: FleetReturnInspectionWorksheet,
  opts?: {
    sectionId?: string;
    requireAllRated?: boolean;
  },
): string | null {
  const issues = collectInspectionWorksheetValidationIssues(worksheet, opts);
  return issues[0]?.message ?? null;
}
