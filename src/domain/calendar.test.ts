import { describe, expect, it } from 'vitest';
import { daysUntilFirstDoor, isDoorOpen, isDoorsDay } from './calendar';
import { december } from '../test/fakes';

describe('calendar', () => {
  it('opens a door on its own day and keeps it open afterwards', () => {
    expect(isDoorOpen(2026, 5, december(4))).toBe(false);
    expect(isDoorOpen(2026, 5, december(5))).toBe(true);
    expect(isDoorOpen(2026, 5, { year: 2027, month: 1, day: 2 })).toBe(true);
  });

  it('keeps every door shut before December', () => {
    expect(isDoorOpen(2026, 1, { year: 2026, month: 11, day: 30 })).toBe(false);
  });

  it('recognises the day a door opens', () => {
    expect(isDoorsDay(2026, 7, december(7))).toBe(true);
    expect(isDoorsDay(2026, 7, december(8))).toBe(false);
  });

  it('counts days until the first door', () => {
    expect(daysUntilFirstDoor(2026, { year: 2026, month: 11, day: 3 })).toBe(28);
    expect(daysUntilFirstDoor(2026, december(1))).toBe(0);
  });
});
