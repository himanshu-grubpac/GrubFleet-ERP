import {
  DECIMAL_MONEY_PATTERN,
  DECIMAL_MONEY_PATTERN_MESSAGE,
} from '@grubpac/validation';

/** Lease contract write amounts — decimal string (see `@grubpac/validation` money policy). */
export const LEASE_CONTRACT_MONEY_PATTERN = DECIMAL_MONEY_PATTERN;

export const LEASE_CONTRACT_MONEY_PATTERN_MESSAGE =
  DECIMAL_MONEY_PATTERN_MESSAGE;
