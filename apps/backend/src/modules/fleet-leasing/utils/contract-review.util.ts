import type { ContractPricingEvaluation } from './contract-pricing-engine.util';
import type { AssetLineAvailabilityStatus } from './asset-class-availability.util';

export type ReviewAction = 'submit_for_approval' | 'confirm_contract';

export type ReviewMessageLevel = 'info' | 'warning';

export type ContractReviewMessage = {
  level: ReviewMessageLevel;
  text: string;
  code?: string;
};

export type ReviewAssetLineInput = {
  assetClass: string;
  committedQuantity: number;
  ratePerVehicleMonth: string;
  availabilityStatus: string;
  availableNowCount: number;
  inboundCount: number;
  shortfallCount: number;
  awaitingAssetsLine: boolean;
  availabilityMessage: string;
};

export function resolveReviewAction(
  pricing: Pick<ContractPricingEvaluation, 'requiresApproval'>,
): ReviewAction {
  return pricing.requiresApproval ? 'submit_for_approval' : 'confirm_contract';
}

export function buildContractReviewMessages(input: {
  pricing: ContractPricingEvaluation;
  assetLines: ReviewAssetLineInput[];
}): ContractReviewMessage[] {
  const messages: ContractReviewMessage[] = [];

  if (input.pricing.requiresApproval) {
    messages.push({
      level: 'warning',
      code: 'PRICING_REQUIRES_APPROVAL',
      text:
        'One or more line rates or the security deposit are outside standard pricing limits. ' +
        'Submit for approval — the contract will move to Pending Approval until a Fleet/Leasing Manager approves it. ' +
        'It will not activate until approved.',
    });
  }

  for (const line of input.assetLines) {
    const status = line.availabilityStatus as AssetLineAvailabilityStatus;
    if (status === 'shortfall' && line.awaitingAssetsLine) {
      messages.push({
        level: 'info',
        code: 'LINE_AWAITING_ASSETS',
        text: `${line.assetClass}: ${line.committedQuantity} committed — ${line.shortfallCount} unit(s) awaiting future assets (line saved as Awaiting Assets).`,
      });
    } else if (status === 'partial_today') {
      messages.push({
        level: 'info',
        code: 'LINE_PARTIALLY_ALLOCATED',
        text: `${line.assetClass}: Partially allocated — ${line.availableNowCount} available today; ${line.inboundCount} inbound will complete allocation.`,
      });
    }
  }

  const hasAwaitingLine = input.assetLines.some((l) => l.awaitingAssetsLine);
  const allFullyAllocatedToday = input.assetLines.every(
    (l) => l.availabilityStatus === 'covered',
  );

  if (!input.pricing.requiresApproval) {
    if (hasAwaitingLine) {
      messages.push({
        level: 'info',
        code: 'CONTRACT_AWAITING_ASSETS_ON_CONFIRM',
        text: 'Confirming will approve and activate the contract. Status will be Awaiting Assets until shortfall units are available; billing follows allocation rules once vehicles are assigned.',
      });
    } else if (allFullyAllocatedToday && input.assetLines.length > 0) {
      messages.push({
        level: 'info',
        code: 'BILLING_ON_START',
        text: 'All committed units are fully allocated today. Confirming will activate the contract; billing starts on the contract start date per terms.',
      });
    } else if (
      input.assetLines.some((l) => l.availabilityStatus === 'partial_today')
    ) {
      messages.push({
        level: 'info',
        code: 'BILLING_WHEN_FULLY_ALLOCATED',
        text: 'Some lines rely on inbound vehicles. Billing applies when each line is fully allocated and vehicles are assigned, per contract start date and billing frequency.',
      });
    }
  }

  return messages;
}

export function computeCanSubmitReview(input: {
  status: string;
  clientId: string | null;
  pricing: Pick<ContractPricingEvaluation, 'canProceedToReview'>;
}): boolean {
  return (
    input.status === 'draft' &&
    input.clientId != null &&
    input.pricing.canProceedToReview
  );
}
