export const INVENTORY_UNIT_OF_MEASURE_VALUES = [
  'Each',
  'Set',
  'Kg',
  'Litre',
  'Meter',
  'Box',
  'Pair',
] as const;

export type InventoryUnitOfMeasure =
  (typeof INVENTORY_UNIT_OF_MEASURE_VALUES)[number];
