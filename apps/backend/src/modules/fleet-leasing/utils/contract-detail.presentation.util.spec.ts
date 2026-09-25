import {
  buildAvailableActions,
  buildDetailSubtitle,
  buildLifecycleLogMessage,
  buildStatusBanner,
  buildStatusTags,
  findLatestEventByType,
} from './contract-detail.presentation.util';

function ev(
  eventType: string,
  createdAt: string,
  actorUserId: string | null = 'user-1',
): {
  id: string;
  eventType: string;
  message: string;
  actorUserId: string | null;
  createdAt: Date;
} {
  return {
    id: `${eventType}-id`,
    eventType,
    message: 'raw',
    actorUserId,
    createdAt: new Date(createdAt),
  };
}

describe('contract-detail.presentation.util', () => {
  describe('buildAvailableActions', () => {
    it('allows deactivate only when active', () => {
      const active = buildAvailableActions({
        rawStatus: 'active',
        canPauseBilling: false,
        hasPendingTerminationApproval: false,
      });
      expect(active.deactivate.allowed).toBe(true);
      expect(active.reactivate.allowed).toBe(false);
      expect(active.editContract.allowed).toBe(true);
    });

    it('allows reactivate from deactivated without approval path', () => {
      const deactivated = buildAvailableActions({
        rawStatus: 'deactivated',
        canPauseBilling: false,
        hasPendingTerminationApproval: false,
      });
      expect(deactivated.editContract.allowed).toBe(true);
      expect(deactivated.reactivate.allowed).toBe(true);
      expect(deactivated.deactivate.allowed).toBe(false);
      expect(deactivated.requestTermination.allowed).toBe(true);
    });

    it('blocks reactivate when closed or pending termination', () => {
      const closed = buildAvailableActions({
        rawStatus: 'closed',
        canPauseBilling: true,
        hasPendingTerminationApproval: false,
      });
      expect(closed.editContract.allowed).toBe(false);
      expect(closed.editContract.disabledReason).toMatch(/closed contract/i);
      expect(closed.reactivate.allowed).toBe(false);
      expect(closed.reactivate.disabledReason).toMatch(
        /cannot be reactivated/i,
      );

      const pending = buildAvailableActions({
        rawStatus: 'pending_termination',
        canPauseBilling: true,
        hasPendingTerminationApproval: true,
      });
      expect(pending.reactivate.allowed).toBe(false);
      expect(pending.approveTermination.allowed).toBe(true);
    });

    it('gates pause billing on return progress', () => {
      const noReturns = buildAvailableActions({
        rawStatus: 'deactivated',
        canPauseBilling: false,
        hasPendingTerminationApproval: false,
      });
      expect(noReturns.pauseBilling.allowed).toBe(false);

      const ready = buildAvailableActions({
        rawStatus: 'deactivated',
        canPauseBilling: true,
        hasPendingTerminationApproval: false,
      });
      expect(ready.pauseBilling.allowed).toBe(true);
    });
  });

  describe('buildStatusTags', () => {
    it('shows Deactivated and Billing paused when billing_paused status', () => {
      const tags = buildStatusTags({
        rawStatus: 'billing_paused',
        billingPaused: true,
        onHold: true,
      });
      expect(tags).toEqual(['Deactivated', 'Billing paused']);
    });

    it('shows Closed for terminated contract', () => {
      expect(
        buildStatusTags({
          rawStatus: 'closed',
          billingPaused: true,
          onHold: true,
        }),
      ).toEqual(['Closed']);
    });
  });

  describe('buildDetailSubtitle', () => {
    it('uses on-hold billing message for deactivated', () => {
      const sub = buildDetailSubtitle({
        rawStatus: 'deactivated',
        clientCompanyName: 'Meridian Logistics Pvt. Ltd.',
        billingPaused: false,
        onHold: true,
      });
      expect(sub).toContain('On hold');
      expect(sub).toContain('billing continues');
    });
  });

  describe('buildStatusBanner', () => {
    it('includes termination timestamp for closed contracts', () => {
      const events = [
        ev('contract.termination_approved', '2026-09-20T10:30:00.000Z'),
      ];
      const banner = buildStatusBanner({
        rawStatus: 'closed',
        events,
        labelsByUserId: new Map([['user-1', 'Contract Admin']]),
      });
      expect(banner?.level).toBe('success');
      expect(banner?.occurredAt).toBe('2026-09-20T10:30:00.000Z');
      expect(banner?.text).toMatch(/successfully completed/i);
      expect(banner?.actorLabel).toBe('Contract Admin');
    });
  });

  describe('findLatestEventByType', () => {
    it('returns most recent matching event (events newest-first)', () => {
      const events = [
        ev('contract.deactivated', '2026-09-22T00:00:00.000Z'),
        ev('contract.reactivated', '2026-09-21T00:00:00.000Z'),
        ev('contract.deactivated', '2026-09-20T00:00:00.000Z'),
      ];
      expect(
        findLatestEventByType(
          events,
          'contract.deactivated',
        )?.createdAt.toISOString(),
      ).toBe('2026-09-22T00:00:00.000Z');
    });
  });

  describe('buildLifecycleLogMessage', () => {
    it('uses actor in reactivated message', () => {
      expect(
        buildLifecycleLogMessage('contract.reactivated', 'x', 'Alex'),
      ).toContain('Alex reactivated');
    });
  });
});
