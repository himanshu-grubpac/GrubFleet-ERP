export type ContractFieldChange = {
  field: string;
  previousValue: unknown;
  newValue: unknown;
};

export type ContractSnapshotForDiff = {
  clientId: string | null;
  startDate: string | null;
  endDate: string | null;
  termMonths: number | null;
  securityDeposit: string | null;
  billingFrequency: string;
  additionalTerms: string | null;
  amcTier: string | null;
  description: string | null;
  assetLines: Array<{
    assetClass: string;
    committedQuantity: number;
    ratePerVehicleMonth: string;
  }>;
  vehicleIds: string[];
};

function dateIso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export function contractRowToSnapshot(input: {
  clientId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  termMonths: number | null;
  securityDeposit: string | null;
  billingFrequency: string;
  additionalTerms: string | null;
  amcTier: string | null;
  description: string | null;
  assetLines: Array<{
    assetClass: string;
    committedQuantity: number;
    ratePerVehicleMonth: string;
  }>;
  vehicleIds: string[];
}): ContractSnapshotForDiff {
  return {
    clientId: input.clientId,
    startDate: dateIso(input.startDate),
    endDate: dateIso(input.endDate),
    termMonths: input.termMonths,
    securityDeposit: input.securityDeposit,
    billingFrequency: input.billingFrequency,
    additionalTerms: input.additionalTerms,
    amcTier: input.amcTier,
    description: input.description,
    assetLines: input.assetLines.map((l) => ({ ...l })),
    vehicleIds: [...input.vehicleIds].sort(),
  };
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

export function computeContractFieldDiff(
  before: ContractSnapshotForDiff,
  after: ContractSnapshotForDiff,
): ContractFieldChange[] {
  const changes: ContractFieldChange[] = [];
  const scalarKeys: Array<
    keyof Omit<ContractSnapshotForDiff, 'assetLines' | 'vehicleIds'>
  > = [
    'clientId',
    'startDate',
    'endDate',
    'termMonths',
    'securityDeposit',
    'billingFrequency',
    'additionalTerms',
    'amcTier',
    'description',
  ];
  for (const key of scalarKeys) {
    if (before[key] !== after[key]) {
      changes.push({
        field: key,
        previousValue: before[key],
        newValue: after[key],
      });
    }
  }
  if (stableJson(before.assetLines) !== stableJson(after.assetLines)) {
    changes.push({
      field: 'assetLines',
      previousValue: before.assetLines,
      newValue: after.assetLines,
    });
  }
  if (stableJson(before.vehicleIds) !== stableJson(after.vehicleIds)) {
    changes.push({
      field: 'vehicleIds',
      previousValue: before.vehicleIds,
      newValue: after.vehicleIds,
    });
  }
  return changes;
}
