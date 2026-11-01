import { describe, it, expect } from 'vitest';
import { parseRupeesToPaise, formatINR } from './money.ts';

describe('money.ts', () => {
  describe('parseRupeesToPaise', () => {
    it('returns null for edge cases like "12.345", "-5", and ""', () => {
      expect(parseRupeesToPaise('12.345')).toBeNull();
      expect(parseRupeesToPaise('-5')).toBeNull();
      expect(parseRupeesToPaise('')).toBeNull();
      expect(parseRupeesToPaise('   ')).toBeNull();
      expect(parseRupeesToPaise('abc')).toBeNull();
      expect(parseRupeesToPaise('12.34.56')).toBeNull();
    });

    it('parses valid rupee strings into integer paise amounts without float math', () => {
      expect(parseRupeesToPaise('0')).toBe(0);
      expect(parseRupeesToPaise('0.00')).toBe(0);
      expect(parseRupeesToPaise('1')).toBe(100);
      expect(parseRupeesToPaise('100')).toBe(10000);
      expect(parseRupeesToPaise('100.5')).toBe(10050);
      expect(parseRupeesToPaise('100.05')).toBe(10005);
      expect(parseRupeesToPaise('100.50')).toBe(10050);
      expect(parseRupeesToPaise('1,00,000.00')).toBe(10000000);
      expect(parseRupeesToPaise('24000')).toBe(2400000);
    });
  });

  describe('formatINR', () => {
    it('formats ₹1,00,000.00 correctly with Indian grouping', () => {
      expect(formatINR(10000000)).toBe('₹1,00,000.00');
    });

    it('formats ₹0.00 correctly', () => {
      expect(formatINR(0)).toBe('₹0.00');
      expect(formatINR(-0)).toBe('₹0.00');
    });

    it('handles negative values correctly', () => {
      expect(formatINR(-50000)).toBe('-₹500.00');
      expect(formatINR(-10000000)).toBe('-₹1,00,000.00');
    });

    it('formats various amounts correctly', () => {
      expect(formatINR(1250)).toBe('₹12.50');
      expect(formatINR(149999)).toBe('₹1,499.99');
      expect(formatINR(2400000)).toBe('₹24,000.00');
      expect(formatINR(325000)).toBe('₹3,250.00');
      expect(formatINR(1050000)).toBe('₹10,500.00');
    });
  });
});

