import {
  STANDARD_RATE_CARD_INR,
  isRateOnStandardCard,
} from '../constants/standard-rate-card';

export type PricingMessageLevel = 'success' | 'warning' | 'error';

export type ContractPricingEvaluation = {
  withinStandardLimits: boolean;
  requiresApproval: boolean;
  canProceedToReview: boolean;
  depositRequired: boolean;
  depositFloor: string | null;
  monthlyCommitmentTotal: string;
  lineRateExceptions: Array<{ assetClass: string; ratePerVehicleMonth: string }>;
  messages: Array<{ level: PricingMessageLevel; text: string }>;
};

type LineInput = {
  assetClass: string;
  committedQuantity: number;
  ratePerVehicleMonth: string;
};

export function evaluateContractPricing(input: {
  securityDeposit: string | null | undefined;
  assetLines: LineInput[];
}): ContractPricingEvaluation {
  const messages: ContractPricingEvaluation['messages'] = [];
  const depositRequired = !input.securityDeposit?.trim();
  const monthlyTotal = input.assetLines.reduce(
    (sum, line) =>
      sum + line.committedQuantity * Number(line.ratePerVehicleMonth),
    0,
  );
  const depositFloor =
    input.assetLines.length > 0 ? String(Math.round(monthlyTotal)) : null;

  const lineRateExceptions = input.assetLines.filter(
    (line) => !isRateOnStandardCard(line.assetClass, line.ratePerVehicleMonth),
  );

  let depositBelowFloor = false;
  if (!depositRequired && depositFloor != null) {
    depositBelowFloor = Number(input.securityDeposit) < Number(depositFloor);
  }

  const requiresApproval =
    lineRateExceptions.length > 0 || depositBelowFloor;

  if (depositRequired) {
    messages.push({
      level: 'error',
      text: 'Security deposit is required — the pricing engine cannot evaluate standard limits without it.',
    });
  } else if (requiresApproval) {
    messages.push({
      level: 'warning',
      text: 'Outside standard pricing limits. One or more lines\' rate, or the deposit, falls below the pricing engine\'s floor and does not match a sanctioned discount — confirming will raise a single approval request covering the whole contract, to the Fleet/Leasing Manager, instead of activating directly.',
    });
  } else {
    messages.push({
      level: 'success',
      text: 'Every line\'s rate, and the deposit, are within the pricing engine\'s standard limits — no approval needed. Confirming will activate the contract directly.',
    });
  }

  const canProceedToReview =
    !depositRequired &&
    input.assetLines.length > 0 &&
    monthlyTotal > 0;

  return {
    withinStandardLimits: !requiresApproval && !depositRequired,
    requiresApproval: requiresApproval && !depositRequired,
    canProceedToReview,
    depositRequired,
    depositFloor,
    monthlyCommitmentTotal: String(Math.round(monthlyTotal)),
    lineRateExceptions: lineRateExceptions.map((l) => ({
      assetClass: l.assetClass,
      ratePerVehicleMonth: l.ratePerVehicleMonth,
    })),
    messages,
  };
}

/** Rate below catalog standard (not on card) is treated as below floor unless Finance adds sanctioned discounts. */
export function isRateBelowPricingFloor(
  assetClass: string,
  ratePerVehicleMonth: string,
): boolean {
  const standard = STANDARD_RATE_CARD_INR[assetClass];
  if (!standard) {
    return true;
  }
  return Number(ratePerVehicleMonth) < Number(standard);
}
