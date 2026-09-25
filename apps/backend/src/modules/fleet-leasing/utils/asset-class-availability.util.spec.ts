import { computeAssetLineAvailability } from './asset-class-availability.util';

describe('computeAssetLineAvailability', () => {
  it('returns covered when available >= committed', () => {
    const r = computeAssetLineAvailability('Sedan', 3, 14, 0, false);
    expect(r.status).toBe('covered');
    expect(r.availabilityCovered).toBe(true);
    expect(r.shortfallCount).toBe(0);
  });

  it('returns partial_today when inbound fills gap', () => {
    const r = computeAssetLineAvailability('SUV', 4, 2, 2, false);
    expect(r.status).toBe('partial_today');
    expect(r.availabilityCovered).toBe(true);
  });

  it('returns shortfall when total cover insufficient', () => {
    const r = computeAssetLineAvailability('Pickup', 2, 0, 1, false);
    expect(r.status).toBe('shortfall');
    expect(r.shortfallCount).toBe(1);
    expect(r.awaitingAssetsLine).toBe(false);
  });

  it('marks awaiting line when shortfall confirmed', () => {
    const r = computeAssetLineAvailability('Pickup', 2, 0, 1, true);
    expect(r.awaitingAssetsLine).toBe(true);
  });
});
