export interface PostgresErrorFingerprint {
  sqlState: string;
  constraint?: string;
  detail?: string;
  table?: string;
}

export interface MappedPostgresHttpError {
  statusCode: number;
  message: string;
  code: string;
}

const MAX_CAUSE_DEPTH = 6;

const POSTGRES_SQL_STATE = /^[0-9A-Z]{5}$/;

/** Known unique indexes → safe client message (no PII, no key values). */
const UNIQUE_CONSTRAINT_OVERRIDES: Record<
  string,
  Pick<MappedPostgresHttpError, 'message' | 'code'>
> = {
  organisation_drivers_org_license_norm_uidx: {
    message:
      'A driver with this license number already exists in the organisation',
    code: 'DRIVER_LICENSE_DUPLICATE',
  },
  organisation_drivers_org_cpr_uidx: {
    message: 'A driver with this CPR number already exists in the organisation',
    code: 'DRIVER_CPR_DUPLICATE',
  },
  asset_register_vehicles_org_registration_norm_uidx: {
    message:
      'A vehicle with this registration number already exists in the organisation',
    code: 'VEHICLE_REGISTRATION_DUPLICATE',
  },
  lease_contracts_org_number_uidx: {
    message: 'A lease contract with this number already exists',
    code: 'LEASE_CONTRACT_NUMBER_DUPLICATE',
  },
  roles_org_name_uidx: {
    message: 'Role name already exists in this organization',
    code: 'ROLE_NAME_CONFLICT',
  },
  users_email_uidx: {
    message: 'An account with this email already exists',
    code: 'USER_EMAIL_DUPLICATE',
  },
  organisation_location_types_org_name_uidx: {
    message: 'Location type with this name already exists',
    code: 'LOCATION_TYPE_NAME_DUPLICATE',
  },
  asset_register_asset_classes_org_name_uidx: {
    message: 'An asset class with this name already exists in the organisation',
    code: 'ASSET_CLASS_NAME_DUPLICATE',
  },
  asset_register_asset_masters_org_class_name_uidx: {
    message:
      'An asset master with this name already exists for this asset class',
    code: 'ASSET_MASTER_NAME_DUPLICATE',
  },
  asset_register_vehicles_org_fleet_code_uidx: {
    message: 'This fleet code is already assigned to another vehicle',
    code: 'FLEET_CODE_DUPLICATE',
  },
  inventory_catalog_parts_org_name_uidx: {
    message: 'Part name already exists in this organization',
    code: 'INVENTORY_PART_NAME_DUPLICATE',
  },
  fleet_clients_org_code_uidx: {
    message: 'A fleet client with this code already exists',
    code: 'FLEET_CLIENT_CODE_DUPLICATE',
  },
  fleet_vehicles_org_reg_uidx: {
    message:
      'A fleet vehicle with this registration number already exists in the organisation',
    code: 'FLEET_VEHICLE_REGISTRATION_DUPLICATE',
  },
  finance_invoices_org_number_uidx: {
    message: 'An invoice with this number already exists',
    code: 'FINANCE_INVOICE_NUMBER_DUPLICATE',
  },
  finance_invoice_payments_org_payment_number_uidx: {
    message: 'A payment with this number already exists',
    code: 'FINANCE_PAYMENT_NUMBER_DUPLICATE',
  },
  inventory_stock_receipts_org_number_uidx: {
    message: 'A stock receipt with this number already exists',
    code: 'INVENTORY_STOCK_RECEIPT_NUMBER_DUPLICATE',
  },
  inventory_parts_requests_org_number_uidx: {
    message: 'A parts request with this number already exists',
    code: 'INVENTORY_PARTS_REQUEST_NUMBER_DUPLICATE',
  },
  workshop_labor_job_cards_org_name_uidx: {
    message: 'Labor job card name already exists in this organization',
    code: 'WORKSHOP_LABOR_JOB_CARD_NAME_DUPLICATE',
  },
  workshop_amc_tiers_org_name_uidx: {
    message: 'AMC tier name already exists',
    code: 'WORKSHOP_AMC_TIER_NAME_DUPLICATE',
  },
  workshop_maintenance_schedules_org_name_uidx: {
    message: 'Maintenance schedule name already exists',
    code: 'WORKSHOP_MAINTENANCE_SCHEDULE_NAME_DUPLICATE',
  },
  workshop_amc_subscribers_org_code_uidx: {
    message: 'AMC subscriber code already exists',
    code: 'WORKSHOP_AMC_SUBSCRIBER_CODE_DUPLICATE',
  },
  workshop_amc_subscribers_org_vehicle_tier_uidx: {
    message: 'This vehicle is already subscribed to this tier',
    code: 'WORKSHOP_AMC_SUBSCRIBER_DUPLICATE',
  },
  lease_contract_asset_lines_contract_class_uidx: {
    message: 'This asset class is already on the lease contract',
    code: 'LEASE_CONTRACT_ASSET_LINE_DUPLICATE',
  },
  lease_contract_asset_lines_contract_class_id_uidx: {
    message: 'This asset class is already on the lease contract',
    code: 'LEASE_CONTRACT_ASSET_LINE_DUPLICATE',
  },
};

export function extractPostgresError(
  err: unknown,
  depth = 0,
): PostgresErrorFingerprint | null {
  if (depth > MAX_CAUSE_DEPTH || err === null || err === undefined) {
    return null;
  }

  if (typeof err === 'object') {
    const record = err as Record<string, unknown>;
    const rawCode = record.code;
    if (typeof rawCode === 'string' && POSTGRES_SQL_STATE.test(rawCode)) {
      return {
        sqlState: rawCode,
        constraint:
          typeof record.constraint === 'string' ? record.constraint : undefined,
        detail: typeof record.detail === 'string' ? record.detail : undefined,
        table: typeof record.table === 'string' ? record.table : undefined,
      };
    }

    if ('cause' in record) {
      const nested = extractPostgresError(record.cause, depth + 1);
      if (nested) {
        return nested;
      }
    }
  }

  if (err instanceof Error) {
    const nested = extractPostgresError(err.cause, depth + 1);
    if (nested) {
      return nested;
    }
  }

  return null;
}

export function mapPostgresErrorToHttp(
  err: unknown,
): MappedPostgresHttpError | null {
  const pg = extractPostgresError(err);
  if (!pg) {
    return null;
  }

  switch (pg.sqlState) {
    case '23505':
      return mapUniqueViolation(pg);
    case '23503':
      return mapForeignKeyViolation(pg);
    case '23502':
      return {
        statusCode: 400,
        message: 'A required field is missing',
        code: 'NOT_NULL_VIOLATION',
      };
    case '23514':
      return {
        statusCode: 400,
        message: 'The value does not satisfy database constraints',
        code: 'CHECK_VIOLATION',
      };
    default:
      return null;
  }
}

function mapUniqueViolation(
  pg: PostgresErrorFingerprint,
): MappedPostgresHttpError {
  if (pg.constraint) {
    const override = UNIQUE_CONSTRAINT_OVERRIDES[pg.constraint];
    if (override) {
      return { statusCode: 409, ...override };
    }
  }

  return {
    statusCode: 409,
    message: 'A record with the same unique value already exists',
    code: 'UNIQUE_VIOLATION',
  };
}

function mapForeignKeyViolation(
  pg: PostgresErrorFingerprint,
): MappedPostgresHttpError {
  const detail = pg.detail ?? '';

  if (detail.includes('is not present in table')) {
    return {
      statusCode: 404,
      message: 'Referenced record does not exist',
      code: 'REFERENCE_NOT_FOUND',
    };
  }

  if (detail.includes('is still referenced from table')) {
    return {
      statusCode: 409,
      message:
        'Cannot complete the operation because related records still exist',
      code: 'REFERENCE_VIOLATION',
    };
  }

  return {
    statusCode: 400,
    message: 'Referenced record is invalid or missing',
    code: 'FOREIGN_KEY_VIOLATION',
  };
}
