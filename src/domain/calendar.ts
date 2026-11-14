import type { CalendarDate } from './types';

export const FIRST_DOOR = 1;
export const LAST_DOOR = 24;
const DECEMBER = 12;

export function isSameDate(a: CalendarDate, b: CalendarDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function doorDate(seasonYear: number, doorNumber: number): CalendarDate {
  return { year: seasonYear, month: DECEMBER, day: doorNumber };
}

function compareDates(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

export function isDoorOpen(seasonYear: number, doorNumber: number, today: CalendarDate): boolean {
  return compareDates(today, doorDate(seasonYear, doorNumber)) >= 0;
}

export function isDoorsDay(seasonYear: number, doorNumber: number, today: CalendarDate): boolean {
  return isSameDate(today, doorDate(seasonYear, doorNumber));
}

export function allDoorNumbers(): number[] {
  return Array.from({ length: LAST_DOOR - FIRST_DOOR + 1 }, (_, i) => FIRST_DOOR + i);
}

export function daysUntilFirstDoor(seasonYear: number, today: CalendarDate): number {
  const msPerDay = 86_400_000;
  const toUtc = (d: CalendarDate) => Date.UTC(d.year, d.month - 1, d.day);
  return Math.round((toUtc(doorDate(seasonYear, FIRST_DOOR)) - toUtc(today)) / msPerDay);
}

export function toIsoDate(date: CalendarDate): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

export function fromIsoDate(iso: string): CalendarDate {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}
