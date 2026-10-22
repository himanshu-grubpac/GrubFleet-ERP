import {
  computeEffectivePoolAvailableNow,
  computePoolAvailableNow,
} from './asset-class-pool.util';

describe('computePoolAvailableNow', () => {
  it('subtracts reserved unallocated commitments from physical pool', () => {
    expect(computePoolAvailableNow(5, 2)).toBe(3);
  });

  it('never returns negative availability', () => {
    expect(computePoolAvailableNow(1, 4)).toBe(0);
  });

  it('ignores negative reserved input', () => {
    expect(computePoolAvailableNow(3, -1)).toBe(3);
  });
});

describe('computeEffectivePoolAvailableNow', () => {
  it('credits vehicles already allocated on the excluded contract', () => {
    expect(computeEffectivePoolAvailableNow(0, 0, 2)).toBe(2);
    expect(computeEffectivePoolAvailableNow(0, 3, 1)).toBe(1);
  });
});
