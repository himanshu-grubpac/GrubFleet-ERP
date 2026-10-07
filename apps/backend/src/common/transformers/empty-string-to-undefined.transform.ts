import type { TransformFnParams } from 'class-transformer';

/** Optional UUID/string fields: treat "" and whitespace-only as absent (undefined). */
export function emptyStringToUndefined({ value }: TransformFnParams): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
}
