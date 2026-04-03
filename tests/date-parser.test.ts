import { describe, it, expect, beforeEach } from 'vitest';
import { parseDate } from '../src/date-parser.js';

// Helper: build the expected ISO date string (YYYY-MM-DDT00:00:00+0000)
function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00+0000`;
}

// Helper: build the expected ISO datetime string (YYYY-MM-DDTHH:MM:00+0000)
function isoDateTime(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mi}:00+0000`;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

describe('parseDate', () => {
  describe('relative day keywords', () => {
    it('"today" returns today\'s date', () => {
      const now = new Date();
      const result = parseDate('today');
      expect(result).toBe(isoDate(now));
    });

    it('"tomorrow" returns tomorrow\'s date', () => {
      const expected = new Date();
      expected.setDate(expected.getDate() + 1);
      expect(parseDate('tomorrow')).toBe(isoDate(expected));
    });

    it('"yesterday" returns yesterday\'s date', () => {
      const expected = new Date();
      expected.setDate(expected.getDate() - 1);
      expect(parseDate('yesterday')).toBe(isoDate(expected));
    });
  });

  describe('end-of-period keywords', () => {
    it('"end of week" returns the upcoming Sunday', () => {
      const result = parseDate('end of week');
      const d = new Date(result);
      expect(d.getDay()).toBe(0); // Sunday
    });

    it('"eow" is an alias for end of week', () => {
      expect(parseDate('eow')).toBe(parseDate('end of week'));
    });

    it('"end of month" returns the last day of the current month', () => {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      expect(parseDate('end of month')).toBe(isoDate(lastDay));
    });

    it('"eom" is an alias for end of month', () => {
      expect(parseDate('eom')).toBe(parseDate('end of month'));
    });
  });

  describe('"in N units" relative offsets', () => {
    it('"in 3 hours" returns ~3 hours from now (with time component)', () => {
      const before = new Date();
      const result = parseDate('in 3 hours');

      // Result must include a non-midnight time component
      expect(result).toMatch(/T\d{2}:\d{2}:00\+0000$/);

      // The function formats local time and appends +0000 as a literal suffix
      // (it's not true UTC). Compare the hours component directly.
      const timeMatch = result.match(/T(\d{2}):(\d{2}):/);
      expect(timeMatch).not.toBeNull();
      const resultHour = parseInt(timeMatch![1], 10);
      const resultMin  = parseInt(timeMatch![2], 10);
      const resultTotalMins = resultHour * 60 + resultMin;

      const expectedDate = new Date(before.getTime() + 3 * 60 * 60 * 1000);
      const expectedTotalMins = expectedDate.getHours() * 60 + expectedDate.getMinutes();

      // Allow ±2 minutes of drift
      expect(Math.abs(resultTotalMins - expectedTotalMins)).toBeLessThanOrEqual(2);
    });

    it('"in 2 days" returns 2 days from now (midnight)', () => {
      const expected = new Date();
      expected.setDate(expected.getDate() + 2);
      expect(parseDate('in 2 days')).toBe(isoDate(expected));
    });

    it('"in 1 week" returns 7 days from now', () => {
      const expected = new Date();
      expected.setDate(expected.getDate() + 7);
      expect(parseDate('in 1 week')).toBe(isoDate(expected));
    });
  });

  describe('named day navigation', () => {
    it('"next monday" returns the next Monday', () => {
      const result = parseDate('next monday');
      const d = new Date(result);
      expect(d.getDay()).toBe(1); // Monday

      // Must be strictly in the future (at least 1 day away)
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      expect(d.getTime()).toBeGreaterThan(now.getTime());
    });

    it('"friday" returns the next Friday (even if today is Friday)', () => {
      const result = parseDate('friday');
      const d = new Date(result);
      expect(d.getDay()).toBe(5); // Friday

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      // Must be at least 1 day ahead (code uses daysUntil <= 0 → +7)
      expect(d.getTime()).toBeGreaterThan(now.getTime());
    });

    it('"friday 5pm" returns the next Friday at 17:00', () => {
      const result = parseDate('friday 5pm');
      // Must have time component
      expect(result).toMatch(/T\d{2}:\d{2}:00\+0000$/);

      // Parse hours — the result is local time formatted, so grab the hour from the string
      const timeMatch = result.match(/T(\d{2}):(\d{2})/);
      expect(timeMatch).not.toBeNull();
      expect(timeMatch![1]).toBe('17');
      expect(timeMatch![2]).toBe('00');

      // Must be a Friday
      const d = new Date(result.replace('+0000', 'Z'));
      // Use local-day detection since the function uses local time internally
      const resultStr = result.substring(0, 10);
      const localDate = new Date(resultStr + 'T12:00:00');
      expect(localDate.getDay()).toBe(5);
    });
  });

  describe('ISO date pass-through', () => {
    it('ISO date "2025-06-15" passes through unchanged', () => {
      expect(parseDate('2025-06-15')).toBe('2025-06-15');
    });

    it('ISO datetime "2025-06-15T14:30:00+0000" passes through unchanged', () => {
      expect(parseDate('2025-06-15T14:30:00+0000')).toBe('2025-06-15T14:30:00+0000');
    });
  });

  describe('invalid / unrecognised strings', () => {
    it('returns the original string as-is for unknown inputs', () => {
      // The implementation falls back to returning the trimmed input
      expect(parseDate('gibberish')).toBe('gibberish');
      expect(parseDate('  spaces  ')).toBe('spaces');
    });

    it('handles empty string without throwing', () => {
      expect(() => parseDate('')).not.toThrow();
    });
  });

  describe('+Nd / +Nw shorthand', () => {
    it('"+3d" returns 3 days from today', () => {
      const expected = new Date();
      expected.setDate(expected.getDate() + 3);
      expect(parseDate('+3d')).toBe(isoDate(expected));
    });

    it('"+2w" returns 14 days from today', () => {
      const expected = new Date();
      expected.setDate(expected.getDate() + 14);
      expect(parseDate('+2w')).toBe(isoDate(expected));
    });
  });
});
