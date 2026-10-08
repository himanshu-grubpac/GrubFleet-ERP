import {
  assetClassCodeCandidate,
  deriveAssetClassCodeBase,
} from './asset-class-code.util';

describe('deriveAssetClassCodeBase', () => {
  it('builds initials from words', () => {
    expect(deriveAssetClassCodeBase('Pickup Small Heavy Duty')).toBe('PSHD');
  });

  it('truncates long initial sequences to 8 characters', () => {
    expect(
      deriveAssetClassCodeBase(
        'Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota',
      ),
    ).toHaveLength(8);
  });
});

describe('assetClassCodeCandidate', () => {
  it('uses base on first attempt', () => {
    expect(assetClassCodeCandidate('PSHD', 1)).toBe('PSHD');
  });

  it('appends -2 on second attempt within max length', () => {
    expect(assetClassCodeCandidate('PSHD', 2)).toBe('PSHD-2');
  });
});
