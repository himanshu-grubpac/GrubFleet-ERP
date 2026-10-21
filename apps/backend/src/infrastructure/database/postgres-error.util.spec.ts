import {
  extractPostgresError,
  mapPostgresErrorToHttp,
} from './postgres-error.util';

describe('extractPostgresError', () => {
  it('reads code from a direct pg error object', () => {
    expect(
      extractPostgresError({
        code: '23505',
        constraint: 'roles_org_name_uidx',
      }),
    ).toEqual({
      sqlState: '23505',
      constraint: 'roles_org_name_uidx',
      detail: undefined,
      table: undefined,
    });
  });

  it('walks nested cause chains (Drizzle-style)', () => {
    const inner = {
      code: '23503',
      detail:
        'Key (supplier_id)=(…) is not present in table "organisation_suppliers".',
    };
    expect(
      extractPostgresError({
        message: 'Failed query',
        cause: inner,
      }),
    ).toEqual({
      sqlState: '23503',
      constraint: undefined,
      detail: inner.detail,
      table: undefined,
    });
  });
});

describe('mapPostgresErrorToHttp', () => {
  it('maps unique violation to 409 with domain code when constraint is known', () => {
    expect(
      mapPostgresErrorToHttp({
        code: '23505',
        constraint: 'organisation_drivers_org_license_norm_uidx',
      }),
    ).toEqual({
      statusCode: 409,
      message:
        'A driver with this license number already exists in the organisation',
      code: 'DRIVER_LICENSE_DUPLICATE',
    });
  });

  it('maps inventory catalog part name duplicate', () => {
    expect(
      mapPostgresErrorToHttp({
        code: '23505',
        constraint: 'inventory_catalog_parts_org_name_uidx',
      }),
    ).toEqual({
      statusCode: 409,
      message: 'Part name already exists in this organization',
      code: 'INVENTORY_PART_NAME_DUPLICATE',
    });
  });

  it('maps unknown unique violation to generic UNIQUE_VIOLATION', () => {
    expect(
      mapPostgresErrorToHttp({
        code: '23505',
        constraint: 'some_other_uidx',
      }),
    ).toEqual({
      statusCode: 409,
      message: 'A record with the same unique value already exists',
      code: 'UNIQUE_VIOLATION',
    });
  });

  it('maps missing FK reference to 404 REFERENCE_NOT_FOUND', () => {
    expect(
      mapPostgresErrorToHttp({
        code: '23503',
        detail:
          'Key (location_id)=(…) is not present in table "organisation_locations".',
      }),
    ).toEqual({
      statusCode: 404,
      message: 'Referenced record does not exist',
      code: 'REFERENCE_NOT_FOUND',
    });
  });

  it('maps blocking FK reference to 409 REFERENCE_VIOLATION', () => {
    expect(
      mapPostgresErrorToHttp({
        code: '23503',
        detail:
          'Key (id)=(…) is still referenced from table "organisation_locations".',
      }),
    ).toEqual({
      statusCode: 409,
      message:
        'Cannot complete the operation because related records still exist',
      code: 'REFERENCE_VIOLATION',
    });
  });

  it('returns null for non-postgres errors', () => {
    expect(mapPostgresErrorToHttp(new Error('network down'))).toBeNull();
  });
});
