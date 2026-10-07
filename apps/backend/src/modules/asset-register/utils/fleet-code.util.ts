export const FLEET_CODE_PREFIX = 'VH-';
export const FLEET_CODE_SEQUENCE_START = 1001;

export function formatFleetCode(sequence: number): string {
  return `${FLEET_CODE_PREFIX}${sequence}`;
}
