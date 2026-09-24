/** Parse JWT TTL strings like 15m, 7d, 1h into seconds. */
export function parseDurationToSeconds(raw: string): number {
  const match = /^(\d+)([smhd])$/.exec(raw.trim());
  if (!match) {
    throw new Error(`Invalid duration format: ${raw}`);
  }
  const value = Number.parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return value * multipliers[unit];
}
