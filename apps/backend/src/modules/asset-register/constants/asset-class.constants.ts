export const ASSET_REGISTER_VEHICLE_TYPES = ['2W', '3W', '4W'] as const;
export type AssetRegisterVehicleType =
  (typeof ASSET_REGISTER_VEHICLE_TYPES)[number];

export const ASSET_CLASS_NAME_MAX_LENGTH = 255;
export const ASSET_CLASS_DESCRIPTION_MAX_LENGTH = 2000;
export const ASSET_CLASS_BRAND_MAX_LENGTH = 255;
export const ASSET_CLASS_MODEL_NAME_MAX_LENGTH = 255;
export const ASSET_CLASS_FUEL_TYPE_MAX_LENGTH = 64;

/** Product fuel types (asset class spec). */
export const ASSET_CLASS_FUEL_TYPES = [
  'Petrol',
  'Diesel',
  'CNG',
  'Electric',
  'Hybrid',
] as const;

export type AssetClassFuelType = (typeof ASSET_CLASS_FUEL_TYPES)[number];

export const ASSET_CLASS_MILEAGE_UNITS = ['km/L', 'km/kg', 'km/kWh'] as const;

export type AssetClassMileageUnit = (typeof ASSET_CLASS_MILEAGE_UNITS)[number];
export const ASSET_CLASS_FUEL_SYSTEM_MAX_LENGTH = 64;
export const ASSET_CLASS_COLOR_MAX_LENGTH = 128;
export const ASSET_CLASS_COLOR_CODE_MAX_LENGTH = 32;
export const ASSET_CLASS_MILEAGE_UNIT_MAX_LENGTH = 32;
export const ASSET_CLASS_DEFAULT_INTAKE_MAX_LENGTH = 8000;
export const ASSET_CLASS_MANUFACTURING_YEAR_MIN = 1980;
/** Upper bound is the current local calendar year (MaxCurrentLocalCalendarYear). */
export const ASSET_CLASS_ENGINE_CC_MIN = 1;
export const ASSET_CLASS_ENGINE_CC_MAX = 99999;
export const ASSET_CLASS_INTAKE_ITEMS_MAX = 100;
export const ASSET_CLASS_INTAKE_ITEM_MAX_LENGTH = 500;

export const ASSET_CLASS_DEACTIVATE_REASON_MAX_LENGTH = 500;

/** ListAssetClassesQueryDto.search — aligned with fleet list search cap. */
export const ASSET_CLASS_LIST_SEARCH_MAX_LENGTH = 120;

/** Global seed catalog for intake checklist dropdown on create (2026-10-12 meeting). */
export const ASSET_CLASS_INTAKE_CATALOG_ITEMS = [
  'Registration documents verified',
  'Insurance policy copy received',
  'PUC certificate checked',
  'Odometer reading recorded',
  'Fuel level noted',
  'Exterior damage inspection',
  'Tool kit and spare wheel present',
  'Keys and remote handed over',
] as const;
