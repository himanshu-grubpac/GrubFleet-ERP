import { computePurchaseVehicleLineTax } from './purchase-vehicle-line-tax.util';

describe('computePurchaseVehicleLineTax', () => {
  it('INCLUSIVE: meeting example per unit (50000 gross, 18% VAT)', () => {
    const result = computePurchaseVehicleLineTax(1, 5_000_000, 'INCLUSIVE', 18);
    expect(result.lineTotalMinor).toBe(5_000_000);
    expect(result.taxAmountMinor).toBe(900_000);
    expect(result.baseAmountMinor).toBe(4_100_000);
  });

  it('EXCLUSIVE: meeting example per unit (50000 net, 18% VAT)', () => {
    const result = computePurchaseVehicleLineTax(1, 5_000_000, 'EXCLUSIVE', 18);
    expect(result.baseAmountMinor).toBe(5_000_000);
    expect(result.taxAmountMinor).toBe(900_000);
    expect(result.lineTotalMinor).toBe(5_900_000);
  });

  it('INCLUSIVE: multiplies rate by quantity before tax', () => {
    const single = computePurchaseVehicleLineTax(1, 5_000_000, 'INCLUSIVE', 18);
    const double = computePurchaseVehicleLineTax(2, 5_000_000, 'INCLUSIVE', 18);
    expect(double.lineTotalMinor).toBe(single.lineTotalMinor * 2);
    expect(double.taxAmountMinor).toBe(single.taxAmountMinor * 2);
  });
});
