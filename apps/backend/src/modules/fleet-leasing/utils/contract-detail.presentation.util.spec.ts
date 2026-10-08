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
      });
      expect(active.deactivate.allowed).toBe(true);
      expect(active.reactivate.allowed).toBe(false);
      expect(active.editContract.allowed).toBe(true);
      expect(active.terminate.allowed).toBe(false);
    });

    it('allows terminate from deactivated without approval path', () => {
      const deactivated = buildAvailableActions({
        rawStatus: 'deactivated',
        canPauseBilling: false,
      });
      expect(deactivated.editContract.allowed).toBe(false);
      expect(deactivated.editContract.disabledReason).toMatch(
        /cannot be edited until reactivated/i,
      );
      expect(deactivated.reactivate.allowed).toBe(true);
      expect(deactivated.deactivate.allowed).toBe(false);
      expect(deactivated.terminate.allowed).toBe(true);
    });

    it('blocks reactivate when closed; allows terminate when pending legacy status', () => {
      const closed = buildAvailableActions({
        rawStatus: 'closed',
        canPauseBilling: true,
      });
      expect(closed.editContract.allowed).toBe(false);
      expect(closed.editContract.disabledReason).toMatch(/closed contract/i);
      expect(closed.reactivate.allowed).toBe(false);
      expect(closed.reactivate.disabledReason).toMatch(
        /cannot be reactivated/i,
      );
      expect(closed.terminate.allowed).toBe(false);

      const pending = buildAvailableActions({
        rawStatus: 'pending_termination',
        canPauseBilling: true,
      });
      expect(pending.reactivate.allowed).toBe(false);
      expect(pending.terminate.allowed).toBe(true);
    });

    it('gates pause billing on return progress', () => {
      const noReturns = buildAvailableActions({
        rawStatus: 'deactivated',
        canPauseBilling: false,
      });
      expect(noReturns.pauseBilling.allowed).toBe(false);

      const ready = buildAvailableActions({
        rawStatus: 'deactivated',
        canPauseBilling: true,
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

    it('uses allocation counts only for active partial and full', () => {
      expect(
        buildDetailSubtitle({
          rawStatus: 'active',
          clientCompanyName: 'Acme',
          billingPaused: false,
          onHold: false,
          contractFullyAllocated: false,
          totalCommitted: 3,
          totalAllocated: 1,
        }),
      ).toBe('1 of 3 committed unit(s) allocated.');

      expect(
        buildDetailSubtitle({
          rawStatus: 'active',
          clientCompanyName: 'Acme',
          billingPaused: false,
          onHold: false,
          contractFullyAllocated: true,
          totalCommitted: 3,
          totalAllocated: 3,
        }),
      ).toBe('3 of 3 committed unit(s) allocated.');
    });
  });

  describe('buildStatusBanner', () => {
    it('returns no banner for active allocation states (subtitle carries counts)', () => {
      expect(
        buildStatusBanner({
          rawStatus: 'active',
          events: [],
          labelsByUserId: new Map(),
          contractFullyAllocated: true,
          totalCommitted: 3,
          totalAllocated: 3,
        }),
      ).toBeNull();

      expect(
        buildStatusBanner({
          rawStatus: 'active',
          events: [],
          labelsByUserId: new Map(),
          contractFullyAllocated: false,
          totalCommitted: 3,
          totalAllocated: 1,
        }),
      ).toBeNull();
    });

    it('returns no banner for closed contracts (termination toast is FE-only)', () => {
      const events = [
        ev('contract.termination_approved', '2026-09-20T10:30:00.000Z'),
      ];
      const banner = buildStatusBanner({
        rawStatus: 'closed',
        events,
        labelsByUserId: new Map([['user-1', 'Contract Admin']]),
      });
      expect(banner).toBeNull();
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
