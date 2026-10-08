import type { ContractFieldChange } from './contract-field-diff.util';

export type LeaseContractChangeHistoryRow = {
  id: string;
  field: string;
  fieldLabel: string;
  fromValue: string;
  toValue: string;
  changedBy: string;
  changedAt: string;
};

export type ChangeHistoryDisplayLookups = {
  clientNamesById: Map<string, string>;
  vehicleLabelsById: Map<string, string>;
};

const EMPTY_LOOKUPS: ChangeHistoryDisplayLookups = {
  clientNamesById: new Map(),
  vehicleLabelsById: new Map(),
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FIELD_LABELS: Record<string, string> = {
  clientId: 'Client',
  startDate: 'Start date',
  endDate: 'End date',
  termMonths: 'Term (months)',
  securityDeposit: 'Security deposit',
  billingFrequency: 'Billing frequency',
  additionalTerms: 'Additional terms',
  amcTier: 'AMC tier',
  description: 'Description',
  assetLines: 'Asset-class lines',
  vehicleIds: 'Vehicles',
};

const BILLING_FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annually',
};

function formatIndianRupee(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '—';
  }
  const numeric =
    typeof amount === 'number' ? amount : Number.parseFloat(String(amount));
  if (!Number.isFinite(numeric)) {
    return String(amount);
  }
  return `Rs. ${numeric.toLocaleString('en-IN')}`;
}

function formatIsoCalendarDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

type AssetLineSnapshot = {
  assetClass?: string;
  committedQuantity?: number;
  ratePerVehicleMonth?: string;
};

function formatAssetLines(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    return '—';
  }
  const parts = value.map((entry) => {
    if (typeof entry !== 'object' || entry === null) {
      return String(entry);
    }
    const line = entry as AssetLineSnapshot;
    const assetClass = line.assetClass?.trim() || 'Unknown class';
    const qty =
      line.committedQuantity != null ? String(line.committedQuantity) : '—';
    const rate = formatIndianRupee(line.ratePerVehicleMonth);
    return `${assetClass}: ${qty} × ${rate}/mo`;
  });
  return parts.join('; ');
}

function formatVehicleIdList(
  value: unknown,
  vehicleLabelsById: Map<string, string>,
): string {
  if (!Array.isArray(value) || value.length === 0) {
    return '—';
  }
  const labels = value.map((id) => {
    if (typeof id !== 'string') {
      return String(id);
    }
    return vehicleLabelsById.get(id) ?? 'Unknown vehicle';
  });
  return labels.join(', ');
}

function resolveClientLabel(
  value: unknown,
  clientNamesById: Map<string, string>,
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value !== 'string') {
    return '—';
  }
  if (!UUID_RE.test(value)) {
    return value;
  }
  return clientNamesById.get(value) ?? 'Unknown client';
}

function formatDisplayValue(
  field: string,
  value: unknown,
  lookups: ChangeHistoryDisplayLookups,
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  switch (field) {
    case 'clientId':
      return resolveClientLabel(value, lookups.clientNamesById);
    case 'startDate':
    case 'endDate':
      if (typeof value === 'string') {
        return formatIsoCalendarDate(value);
      }
      break;
    case 'securityDeposit':
      return formatIndianRupee(
        typeof value === 'string' || typeof value === 'number' ? value : null,
      );
    case 'billingFrequency':
      if (typeof value === 'string') {
        return BILLING_FREQUENCY_LABELS[value] ?? value;
      }
      break;
    case 'assetLines':
      return formatAssetLines(value);
    case 'vehicleIds':
      return formatVehicleIdList(value, lookups.vehicleLabelsById);
    default:
      break;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return JSON.stringify(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return '—';
}

export function contractFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

export function collectChangeHistoryReferenceIds(
  editLogs: Array<{ changedFields: unknown }>,
): { clientIds: string[]; vehicleIds: string[] } {
  const clientIds = new Set<string>();
  const vehicleIds = new Set<string>();

  for (const log of editLogs) {
    const changes = log.changedFields as ContractFieldChange[];
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      if (change.field === 'clientId') {
        for (const raw of [change.previousValue, change.newValue]) {
          if (typeof raw === 'string' && UUID_RE.test(raw)) {
            clientIds.add(raw);
          }
        }
      }
      if (change.field === 'vehicleIds') {
        for (const raw of [change.previousValue, change.newValue]) {
          if (!Array.isArray(raw)) continue;
          for (const id of raw) {
            if (typeof id === 'string' && UUID_RE.test(id)) {
              vehicleIds.add(id);
            }
          }
        }
      }
    }
  }

  return {
    clientIds: [...clientIds],
    vehicleIds: [...vehicleIds],
  };
}

export function flattenEditLogsToChangeHistoryRows(
  editLogs: Array<{
    id: string;
    actorUserId: string | null;
    changedFields: unknown;
    createdAt: Date;
  }>,
  labelsByUserId: Map<string, string>,
  lookups: ChangeHistoryDisplayLookups = EMPTY_LOOKUPS,
): LeaseContractChangeHistoryRow[] {
  const rows: LeaseContractChangeHistoryRow[] = [];

  for (const log of editLogs) {
    const changes = log.changedFields as ContractFieldChange[];
    if (!Array.isArray(changes)) continue;

    const changedBy =
      (log.actorUserId && labelsByUserId.get(log.actorUserId)) ||
      'Unknown user';
    const changedAt = log.createdAt.toISOString();

    for (const change of changes) {
      rows.push({
        id: `${log.id}:${change.field}`,
        field: change.field,
        fieldLabel: contractFieldLabel(change.field),
        fromValue: formatDisplayValue(
          change.field,
          change.previousValue,
          lookups,
        ),
        toValue: formatDisplayValue(change.field, change.newValue, lookups),
        changedBy,
        changedAt,
      });
    }
  }

  return rows;
}
