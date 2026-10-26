import { Decimal } from 'decimal.js';
import { ValueTransformer } from 'typeorm';

// Maps SQL DECIMAL columns to decimal.js instances so values stay exact in the
// domain layer. Drivers (pg, mysql2) return DECIMAL as a string, which is
// passed straight to Decimal without going through a lossy JS float.
export class DecimalTransformer implements ValueTransformer {
  to(value?: Decimal | null): string | null | undefined {
    // toFixed() (not toString()) avoids exponential notation, e.g. "1e-7".
    return value == null ? value : value.toFixed();
  }

  from(value?: string | null): Decimal | null | undefined {
    return value == null ? value : new Decimal(value);
  }
}
