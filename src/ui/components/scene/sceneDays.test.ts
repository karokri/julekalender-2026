import { describe, expect, it } from 'vitest';
import { rulesFor } from './sceneDays';

describe('skating and snowball days', () => {
  const december = Array.from({ length: 24 }, (_, i) => rulesFor({ year: 2026, month: 12, day: i + 1 }));

  it('only happen on some days', () => {
    const skating = december.filter((r) => r.skating).length;
    const snowballs = december.filter((r) => r.snowballFights).length;
    expect(skating).toBeGreaterThan(3);
    expect(skating).toBeLessThan(16);
    expect(snowballs).toBeGreaterThan(3);
    expect(snowballs).toBeLessThan(16);
  });

  it('are the same for everyone on the same day', () => {
    expect(rulesFor({ year: 2026, month: 12, day: 5 })).toEqual(rulesFor({ year: 2026, month: 12, day: 5 }));
  });
});
