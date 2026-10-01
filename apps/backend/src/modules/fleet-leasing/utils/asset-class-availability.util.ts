export type AssetLineAvailabilityStatus =
  'covered' | 'partial_today' | 'shortfall';

export type AssetClassAvailabilitySnapshot = {
  assetClass: string;
  committedQuantity: number;
  availableNow: number;
  inbound: number;
  totalCover: number;
  shortfallCount: number;
  /** Figma LEASE-03 MVP — lease only against units available today (no inbound/awaiting). */
  mvpAvailableNowCovers: boolean;
  mvpShortByCount: number;
  status: AssetLineAvailabilityStatus;
  availabilityCovered: boolean;
  awaitingAssetsLine: boolean;
  message: string;
};

export function computeAssetLineAvailability(
  assetClass: string,
  committedQuantity: number,
  availableNow: number,
  inbound: number,
  confirmShortfall: boolean,
): AssetClassAvailabilitySnapshot {
  const totalCover = availableNow + inbound;
  const shortfallCount = Math.max(0, committedQuantity - totalCover);
  let status: AssetLineAvailabilityStatus;
  let availabilityCovered = false;
  let awaitingAssetsLine = false;
  let message: string;

  if (shortfallCount > 0) {
    status = 'shortfall';
    awaitingAssetsLine = confirmShortfall;
    message = `Only ${totalCover} of ${committedQuantity} covered (${availableNow} Available + ${inbound} Inbound) — ${shortfallCount} short. Confirming will save this line as Awaiting Assets.`;
  } else if (availableNow >= committedQuantity) {
    status = 'covered';
    availabilityCovered = true;
    message = `${availableNow} Available now — fully covers the committed count.`;
  } else {
    status = 'partial_today';
    availabilityCovered = true;
    message = `${availableNow} Available + ${inbound} Inbound covers the committed count, but only ${availableNow} are Available today — the rest allocates once the Inbound vehicle(s) arrive.`;
  }

  const mvpAvailableNowCovers = committedQuantity <= availableNow;
  const mvpShortByCount = Math.max(0, committedQuantity - availableNow);

  return {
    assetClass,
    committedQuantity,
    availableNow,
    inbound,
    totalCover,
    shortfallCount,
    mvpAvailableNowCovers,
    mvpShortByCount,
    status,
    availabilityCovered,
    awaitingAssetsLine,
    message,
  };
}
