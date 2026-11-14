import type { CalendarDate } from '../../../domain/types';
import type { SceneRules } from './sceneModel';

/**
 * Which days the nisser go skating or have snowball fights. Picked «at random», but the
 * same for everyone on the same day (derived from the date), roughly one day in three.
 */
export function rulesFor(date: CalendarDate): SceneRules {
  const hash = mix(date.year * 400 + date.month * 32 + date.day);
  return {
    skating: hash % 3 === 0,
    snowballFights: Math.floor(hash / 7) % 3 === 0,
  };
}

function mix(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
