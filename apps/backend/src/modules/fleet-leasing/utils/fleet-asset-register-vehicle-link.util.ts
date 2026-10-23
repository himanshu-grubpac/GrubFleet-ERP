import { sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { assetRegisterVehicles } from '../../../database/schema';

/**
 * Match fleet leasing `fleet_vehicles` row to asset register vehicle:
 * registration (trim/lower), registration without spaces, fleet code = leasing reg (legacy/dev),
 * or chassis/VIN when present.
 */
export function assetRegisterFleetVehicleMatchSql(
  organizationIdColumn: AnyColumn | SQL,
  fleetRegistrationNoColumn: AnyColumn | SQL,
  fleetVinColumn: AnyColumn | SQL,
  fleetCodeHintColumn?: AnyColumn | SQL,
): SQL {
  const fleetCodeHintMatch =
    fleetCodeHintColumn !== undefined
      ? sql`OR (
          length(trim(${fleetCodeHintColumn}::text)) > 0
          AND lower(trim(${assetRegisterVehicles.fleetCode})) = lower(trim(${fleetCodeHintColumn}))
        )`
      : sql``;
  return sql`(
    ${assetRegisterVehicles.organizationId} = ${organizationIdColumn}
    AND (
      lower(trim(${assetRegisterVehicles.registrationNumber})) = lower(trim(${fleetRegistrationNoColumn}))
      OR regexp_replace(lower(trim(${assetRegisterVehicles.registrationNumber})), E'\\s+', '', 'g')
        = regexp_replace(lower(trim(${fleetRegistrationNoColumn})), E'\\s+', '', 'g')
      OR lower(trim(${assetRegisterVehicles.fleetCode})) = lower(trim(${fleetRegistrationNoColumn}))
      OR (
        length(trim(${fleetVinColumn}::text)) > 0
        AND lower(trim(${assetRegisterVehicles.chassisNumber})) = lower(trim(${fleetVinColumn}))
      )
      ${fleetCodeHintMatch}
    )
  )`;
}
