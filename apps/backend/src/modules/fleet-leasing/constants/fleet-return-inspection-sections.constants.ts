import { inspectionDamageLineIsComplete } from '../utils/fleet-return-inspection-worksheet-validation.util';

export type FleetReturnInspectionItemRating =
  'unchecked' | 'pass' | 'minor' | 'major';

export type FleetReturnInspectionAttribution =
  'client_damage' | 'wear_tear' | 'pre_existing' | 'missing';

export const FLEET_RETURN_INSPECTION_SECTION_IDS = [
  'documents_keys',
  'glass_mirrors_lights',
  'exterior_body',
  'tyres_wheels',
  'interior_cabin',
  'cargo_box',
  'engine_fluids',
  'brakes_suspension',
  'electricals_battery',
  'branding_accessories',
] as const;

export type FleetReturnInspectionSectionId =
  (typeof FLEET_RETURN_INSPECTION_SECTION_IDS)[number];

export type FleetReturnInspectionCatalogItem = {
  key: string;
  label: string;
};

export type FleetReturnInspectionSectionCatalog = {
  id: FleetReturnInspectionSectionId;
  title: string;
  items: FleetReturnInspectionCatalogItem[];
};

export const FLEET_RETURN_INSPECTION_SECTION_CATALOG: FleetReturnInspectionSectionCatalog[] =
  [
    {
      id: 'documents_keys',
      title: 'Documents & keys',
      items: [
        { key: 'rc_book', label: 'RC book' },
        { key: 'insurance', label: 'Insurance copy' },
        { key: 'puc', label: 'PUC certificate' },
        { key: 'keys_set', label: 'Keys (set count)' },
      ],
    },
    {
      id: 'glass_mirrors_lights',
      title: 'Glass, mirrors & lights',
      items: [
        { key: 'windshield', label: 'Windshield' },
        { key: 'side_mirrors', label: 'Side mirrors' },
        { key: 'headlamps', label: 'Headlamps' },
        { key: 'tail_lamps', label: 'Tail lamps' },
      ],
    },
    {
      id: 'exterior_body',
      title: 'Exterior & body',
      items: [
        { key: 'front_bumper', label: 'Front bumper' },
        { key: 'left_rear_door', label: 'Left rear door' },
        { key: 'right_side_panel', label: 'Right side panel' },
        { key: 'roof', label: 'Roof' },
        { key: 'paint_overall', label: 'Paint overall' },
        { key: 'rear_bumper_tow_hook', label: 'Rear bumper & tow hook' },
      ],
    },
    {
      id: 'tyres_wheels',
      title: 'Tyres & wheels',
      items: [
        { key: 'front_tyres', label: 'Front tyres' },
        { key: 'rear_tyres', label: 'Rear tyres' },
        { key: 'spare_wheel', label: 'Spare wheel' },
      ],
    },
    {
      id: 'interior_cabin',
      title: 'Interior & cabin',
      items: [
        { key: 'seats', label: 'Seats & upholstery' },
        { key: 'dashboard', label: 'Dashboard & controls' },
        { key: 'ac_blower', label: 'AC & blower' },
      ],
    },
    {
      id: 'cargo_box',
      title: 'Cargo box',
      items: [
        { key: 'load_body', label: 'Load body / box' },
        { key: 'tailgate', label: 'Tailgate / shutter' },
      ],
    },
    {
      id: 'engine_fluids',
      title: 'Engine & fluids',
      items: [
        { key: 'engine_oil', label: 'Engine oil level' },
        { key: 'coolant', label: 'Coolant' },
        { key: 'leaks', label: 'Visible leaks' },
      ],
    },
    {
      id: 'brakes_suspension',
      title: 'Brakes & suspension',
      items: [
        { key: 'brake_pedal', label: 'Brake pedal feel' },
        { key: 'handbrake', label: 'Handbrake' },
        { key: 'suspension_noise', label: 'Suspension / underbody' },
      ],
    },
    {
      id: 'electricals_battery',
      title: 'Electricals & battery',
      items: [
        { key: 'battery', label: 'Battery & terminals' },
        { key: 'horn', label: 'Horn' },
        { key: 'wiring', label: 'Exposed wiring' },
      ],
    },
    {
      id: 'branding_accessories',
      title: 'Branding & accessories',
      items: [
        { key: 'client_branding', label: 'Client branding removed' },
        { key: 'toolkit', label: 'Toolkit / jack' },
        { key: 'gps_telematics', label: 'GPS / telematics' },
      ],
    },
  ];

export type FleetReturnInspectionLineItemState = {
  rating: FleetReturnInspectionItemRating;
  note?: string;
  attribution?: FleetReturnInspectionAttribution;
  repairCostMinor?: number;
  photoCount?: number;
};

export type FleetReturnInspectionWorksheet = {
  currentSectionIndex: number;
  sections: Partial<
    Record<
      FleetReturnInspectionSectionId,
      Record<string, FleetReturnInspectionLineItemState>
    >
  >;
};

export type FleetReturnInspectionSummary = {
  majorCount: number;
  minorCount: number;
  missingCount: number;
  excessKm: number;
  repairEstimateMinor: number;
};

export function buildEmptyWorksheet(): FleetReturnInspectionWorksheet {
  const sections: FleetReturnInspectionWorksheet['sections'] = {};
  for (const section of FLEET_RETURN_INSPECTION_SECTION_CATALOG) {
    const items: Record<string, FleetReturnInspectionLineItemState> = {};
    for (const item of section.items) {
      items[item.key] = { rating: 'unchecked' };
    }
    sections[section.id] = items;
  }
  return { currentSectionIndex: 0, sections };
}

export function mergeWorksheetWithCatalog(
  stored: FleetReturnInspectionWorksheet | null | undefined,
): FleetReturnInspectionWorksheet {
  const base = buildEmptyWorksheet();
  if (!stored || typeof stored !== 'object') {
    return base;
  }
  const currentSectionIndex =
    typeof stored.currentSectionIndex === 'number' &&
    stored.currentSectionIndex >= 0 &&
    stored.currentSectionIndex < FLEET_RETURN_INSPECTION_SECTION_IDS.length
      ? stored.currentSectionIndex
      : 0;
  const sections = { ...base.sections };
  if (stored.sections && typeof stored.sections === 'object') {
    for (const section of FLEET_RETURN_INSPECTION_SECTION_CATALOG) {
      const incoming = stored.sections[section.id];
      if (!incoming || typeof incoming !== 'object') continue;
      const merged = { ...sections[section.id]! };
      for (const item of section.items) {
        const row = incoming[item.key];
        if (!row || typeof row !== 'object') continue;
        merged[item.key] = {
          rating: isValidRating(row.rating) ? row.rating : 'unchecked',
          note: typeof row.note === 'string' ? row.note : undefined,
          attribution: isValidAttribution(row.attribution)
            ? row.attribution
            : undefined,
          repairCostMinor:
            typeof row.repairCostMinor === 'number' && row.repairCostMinor >= 0
              ? Math.floor(row.repairCostMinor)
              : undefined,
          photoCount:
            typeof row.photoCount === 'number' && row.photoCount >= 0
              ? Math.floor(row.photoCount)
              : undefined,
        };
      }
      sections[section.id] = merged;
    }
  }
  return { currentSectionIndex, sections };
}

function isValidRating(
  value: unknown,
): value is FleetReturnInspectionItemRating {
  return (
    value === 'unchecked' ||
    value === 'pass' ||
    value === 'minor' ||
    value === 'major'
  );
}

function isValidAttribution(
  value: unknown,
): value is FleetReturnInspectionAttribution {
  return (
    value === 'client_damage' ||
    value === 'wear_tear' ||
    value === 'pre_existing' ||
    value === 'missing'
  );
}

/** Worksheet rollup for "So far" panel and completion gates. */
export function computeInspectionSummary(
  worksheet: FleetReturnInspectionWorksheet,
  params: {
    odometerReading: number;
    handoverOdometer: number;
    leaseKmAllowance: number | null;
  },
): FleetReturnInspectionSummary {
  let majorCount = 0;
  let minorCount = 0;
  let missingCount = 0;
  let repairEstimateMinor = 0;

  for (const section of FLEET_RETURN_INSPECTION_SECTION_CATALOG) {
    const items = worksheet.sections[section.id] ?? {};
    for (const item of section.items) {
      const row = items[item.key];
      if (!row) continue;
      if (row.rating === 'major') majorCount += 1;
      if (row.rating === 'minor') minorCount += 1;
      if (row.attribution === 'missing') missingCount += 1;
      if (
        typeof row.repairCostMinor === 'number' &&
        row.repairCostMinor > 0 &&
        (row.rating === 'minor' || row.rating === 'major')
      ) {
        repairEstimateMinor += row.repairCostMinor;
      }
    }
  }

  const allowance = params.leaseKmAllowance ?? 0;
  const excessKm = Math.max(
    0,
    params.odometerReading - params.handoverOdometer - allowance,
  );

  return {
    majorCount,
    minorCount,
    missingCount,
    excessKm,
    repairEstimateMinor,
  };
}

/** Alias for FE/docs parity — same rollup as {@link computeInspectionSummary}. */
export const computeInspectionWorksheetSummary = computeInspectionSummary;

export function worksheetIsComplete(
  worksheet: FleetReturnInspectionWorksheet,
): boolean {
  for (const section of FLEET_RETURN_INSPECTION_SECTION_CATALOG) {
    const items = worksheet.sections[section.id] ?? {};
    for (const item of section.items) {
      const row = items[item.key];
      if (!row || row.rating === 'unchecked') {
        return false;
      }
      if (!inspectionDamageLineIsComplete(row)) {
        return false;
      }
    }
  }
  return true;
}
