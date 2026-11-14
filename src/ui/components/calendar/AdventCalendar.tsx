import type { Door } from '../../../application/useCases/calendar';
import { CalendarDoor } from './CalendarDoor';
import './calendar.css';

/** A playful, fixed "random" order so the calendar feels hand-made. */
const LAYOUT_ORDER = [7, 15, 1, 22, 10, 18, 3, 24, 12, 5, 20, 9, 14, 2, 17, 11, 23, 6, 19, 4, 13, 21, 8, 16];
const BIG_DOORS = new Set([24, 17, 6, 12]);

interface AdventCalendarProps {
  doors: Door[];
  onOpenDoor: (door: Door) => void;
}

export function AdventCalendar({ doors, onOpenDoor }: AdventCalendarProps) {
  const byNumber = new Map(doors.map((door) => [door.number, door]));
  const ordered = LAYOUT_ORDER.flatMap((n) => byNumber.get(n) ?? []);

  return (
    <section className="calendar" aria-label="Julekalender">
      <ol className="calendar__grid">
        {ordered.map((door) => (
          <li key={door.number} className={BIG_DOORS.has(door.number) ? 'calendar__cell--big' : undefined}>
            <CalendarDoor door={door} onOpen={onOpenDoor} />
          </li>
        ))}
      </ol>
    </section>
  );
}
