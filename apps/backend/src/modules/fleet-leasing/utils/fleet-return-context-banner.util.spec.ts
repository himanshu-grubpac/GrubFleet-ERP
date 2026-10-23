import {
  buildFleetReturnDetailPresentation,
  buildFleetReturnReceiveContextBanners,
  formatFleetReturnExcessKmMessage,
} from './fleet-return-context-banner.util';

describe('fleet-return-context-banner.util', () => {
  it('formats excess km copy for en-IN grouping', () => {
    expect(formatFleetReturnExcessKmMessage(1250)).toContain('1,250');
  });

  it('builds receive banners from preview odometer and condition', () => {
    const banners = buildFleetReturnReceiveContextBanners({
      receivedAt: null,
      conditionAtGlance: 'visible_damage',
      odometerReading: 52_000,
      handoverOdometer: 40_000,
      leaseKmAllowance: 10_000,
    });
    expect(banners).toHaveLength(2);
    expect(banners[0]?.level).toBe('warning');
    expect(banners[1]?.message).toContain('2,000');
  });

  it('includes flow guards on detail presentation', () => {
    const { flowGuards, contextBanners } = buildFleetReturnDetailPresentation(
      {
        receivedAt: null,
        registeredReturn: true,
        vehicleStatus: 'return_pending',
        inspectionStatus: 'not_started',
        handoverOdometer: 1000,
        leaseKmAllowance: 5000,
        vehicleOdometer: 2000,
        expectedReturn: {
          handoverOdometer: 1000,
          leaseKmAllowance: 5000,
        },
        reInspection: {
          status: 'not_started',
          eligible: false,
          reasonIneligible: 'Workshop not closed',
        },
      },
      { previewConditionAtGlance: 'visible_damage' },
    );
    expect(contextBanners.length).toBeGreaterThan(0);
    expect(flowGuards.inspectWorksheetView?.level).toBe('info');
    expect(flowGuards.reInspectView?.message).toContain('Workshop');
  });
});
