import type { Door } from '../../../application/useCases/calendar';
import { isScored } from '../../../domain/scoring';
import type { DoorKind } from '../../../domain/types';
import { Nisse } from '../Nisse';
import { NISSE_LOOKS } from '../nisseLooks';

/** Folk-art palette: barn red, spruce green, cream, night blue, mustard. */
const DOOR_COLORS = ['#b8322e', '#1f5e3b', '#2b4a8b', '#c98a1b', '#8c2f39', '#2f7a6b'];

const KIND_ICONS: Record<DoorKind, string> = {
  quiz: '❓',
  riddle: '🤔',
  dingbat: '🧩',
  challenge: '🎯',
  surprise: '🎁',
};

interface CalendarDoorProps {
  door: Door;
  onOpen: (door: Door) => void;
}

export function CalendarDoor({ door, onOpen }: CalendarDoorProps) {
  const color = DOOR_COLORS[door.number % DOOR_COLORS.length];
  const clickable = door.state === 'open' || door.state === 'answered';
  const classes = ['door', `door--${door.state}`, door.isToday && 'door--today'].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classes}
      style={{ ['--door-color' as string]: color }}
      disabled={!clickable}
      onClick={() => onOpen(door)}
      aria-label={describeDoor(door)}
    >
      <span className="door__inside" aria-hidden="true">
        <DoorInside door={door} />
      </span>
      <span className="door__panel" aria-hidden="true">
        <span className="door__number">{door.number}</span>
        {door.state === 'locked' && <span className="door__badge">🔒</span>}
        {door.isToday && door.state === 'open' && <span className="door__badge door__badge--today">I dag!</span>}
      </span>
    </button>
  );
}

function DoorInside({ door }: { door: Door }) {
  const look = NISSE_LOOKS[door.number % NISSE_LOOKS.length];
  if (door.state === 'answered' && door.content && door.answer) {
    if (!isScored(door.content)) {
      return (
        <>
          <span className="door__icon">{KIND_ICONS[door.content.kind]}</span>
          <span className="door__result door__result--small">{door.content.kind === 'challenge' ? 'Gjort!' : 'Åpnet'}</span>
        </>
      );
    }
    return (
      <>
        <Nisse look={look} mood={door.answer.isCorrect ? 'happy' : 'sad'} size={58} />
        <span className="door__result">{door.answer.isCorrect ? `+${door.points?.total ?? '?'}` : '0'}</span>
      </>
    );
  }
  if (door.state === 'empty') return <span className="door__icon">🎁</span>;
  return <Nisse look={look} mood="idle" size={58} className="door__peeker" />;
}

function describeDoor(door: Door): string {
  switch (door.state) {
    case 'locked':
      return `Luke ${door.number}, låst`;
    case 'empty':
      return `Luke ${door.number}, tom`;
    case 'answered':
      return `Luke ${door.number}, åpnet${door.points ? ` – ${door.points.total} poeng` : ''}`;
    default:
      return `Åpne luke ${door.number}${door.isToday ? ' (dagens luke)' : ''}`;
  }
}
