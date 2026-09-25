export type ContractLineAllocationStatus =
  'allocated' | 'partially_allocated' | 'awaiting_assets';

export type ContractLineAllocationInput = {
  assetClass: string;
  committedQuantity: number;
  allocatedCount: number;
  inboundCount: number;
  shortfallCount: number;
  awaitingAssetsLine: boolean;
  availabilityStatus: string;
};

export type ContractLineAllocationRow = {
  assetClass: string;
  committedQuantity: number;
  allocatedCount: number;
  lineStatus: ContractLineAllocationStatus;
  detailMessage: string;
};

export function resolveContractLineAllocationStatus(
  input: Pick<
    ContractLineAllocationInput,
    | 'committedQuantity'
    | 'allocatedCount'
    | 'awaitingAssetsLine'
    | 'shortfallCount'
    | 'availabilityStatus'
  >,
): ContractLineAllocationStatus {
  const { committedQuantity, allocatedCount } = input;
  if (allocatedCount >= committedQuantity) {
    return 'allocated';
  }
  if (allocatedCount > 0) {
    return 'partially_allocated';
  }
  if (
    input.awaitingAssetsLine ||
    input.shortfallCount > 0 ||
    input.availabilityStatus === 'shortfall'
  ) {
    return 'awaiting_assets';
  }
  return 'awaiting_assets';
}

export function buildLineAllocationDetailMessage(
  input: ContractLineAllocationInput,
  lineStatus: ContractLineAllocationStatus,
): string {
  const remaining = Math.max(0, input.committedQuantity - input.allocatedCount);
  if (lineStatus === 'allocated') {
    return 'All committed units are allocated.';
  }
  if (lineStatus === 'partially_allocated') {
    if (input.inboundCount > 0) {
      const inboundPhrase =
        remaining === 1
          ? '1 more once Inbound arrives'
          : `${remaining} more once Inbound arrives`;
      return inboundPhrase;
    }
    if (input.shortfallCount > 0) {
      return `${remaining} unit(s) awaiting future assets (shortfall confirmed at confirm).`;
    }
    return `${input.allocatedCount} of ${input.committedQuantity} allocated — ${remaining} remaining.`;
  }
  if (input.shortfallCount > 0 || input.awaitingAssetsLine) {
    return `${input.committedQuantity} committed — ${input.shortfallCount || remaining} unit(s) awaiting future assets (shortfall confirmed).`;
  }
  return `${input.committedQuantity} committed — allocation pending when vehicles are assigned from the register.`;
}

export function buildContractLineAllocationRow(
  input: ContractLineAllocationInput,
): ContractLineAllocationRow {
  const lineStatus = resolveContractLineAllocationStatus(input);
  return {
    assetClass: input.assetClass,
    committedQuantity: input.committedQuantity,
    allocatedCount: input.allocatedCount,
    lineStatus,
    detailMessage: buildLineAllocationDetailMessage(input, lineStatus),
  };
}

export type ConfirmationInfoMessage = {
  level: 'info' | 'warning';
  code: string;
  text: string;
};

export function buildContractConfirmationInfoMessages(input: {
  rawStatus: string;
  publicStatus: string;
  contractFullyAllocated: boolean;
  hasAwaitingLines: boolean;
  hasPartialLines: boolean;
}): ConfirmationInfoMessage[] {
  const messages: ConfirmationInfoMessage[] = [
    {
      level: 'info',
      code: 'CONTRACT_CONFIRMED',
      text: 'Contract confirmed — terms are locked and any required approval has cleared.',
    },
    {
      level: 'info',
      code: 'ACTIVE_MEANS_TERMS_LOCKED',
      text:
        `${input.publicStatus} means contract terms are locked and approval requirements are satisfied; ` +
        'it does not mean every asset line is fully allocated yet.',
    },
  ];

  if (input.contractFullyAllocated) {
    messages.push({
      level: 'info',
      code: 'ALL_LINES_ALLOCATED',
      text: 'All committed units are fully allocated. Billing follows contract start date and billing frequency per line.',
    });
  } else if (input.hasAwaitingLines || input.hasPartialLines) {
    messages.push({
      level: 'info',
      code: 'ALLOCATION_IN_PROGRESS',
      text: 'Some lines are awaiting vehicles or partially allocated. Billing applies per line only when that line is fully allocated.',
    });
  }

  messages.push({
    level: 'info',
    code: 'BILLING_WHEN_LINE_FULLY_ALLOCATED',
    text: 'Billing starts for a line only when committed quantity equals allocated vehicles for that line.',
  });
  messages.push({
    level: 'info',
    code: 'VEHICLE_STATUS_ON_ALLOCATION',
    text: 'When a vehicle is allocated to this contract, fleet status moves from Available to Leased.',
  });
  messages.push({
    level: 'info',
    code: 'AUTO_ALLOCATION_FROM_REGISTER_GAP',
    text: 'Automatic allocation when new vehicles enter the Asset Register is not implemented yet — assign vehicles via contract vehicle links until auto-allocation ships.',
  });

  return messages;
}
