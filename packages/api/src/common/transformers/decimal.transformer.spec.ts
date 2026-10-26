import { Decimal } from 'decimal.js';
import { DecimalTransformer } from './decimal.transformer';

describe('DecimalTransformer', () => {
  const transformer = new DecimalTransformer();

  it('reads DB strings into exact Decimals, keeping scale', () => {
    const value = transformer.from('12.50');
    expect(value).toBeInstanceOf(Decimal);
    expect(value?.toFixed(2)).toBe('12.50');
    expect(value?.toNumber()).toBe(12.5);
  });

  it('writes Decimals as plain (non-exponential) strings', () => {
    expect(transformer.to(new Decimal('19.99'))).toBe('19.99');
    expect(transformer.to(new Decimal('0.0000001'))).toBe('0.0000001');
  });

  it('passes null/undefined through', () => {
    expect(transformer.from(null)).toBeNull();
    expect(transformer.from(undefined)).toBeUndefined();
    expect(transformer.to(null)).toBeNull();
    expect(transformer.to(undefined)).toBeUndefined();
  });
});
