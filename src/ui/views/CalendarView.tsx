import { useEffect, useState } from 'react';
import { isDemo, onDemo } from '../../demo/demoBus';
import { getCalendar, type Door } from '../../application/useCases/calendar';
import { daysUntilFirstDoor } from '../../domain/calendar';
import type { DoorContent, Participant } from '../../domain/types';
import { AdventCalendar } from '../components/calendar/AdventCalendar';
import { DoorDialog } from '../components/door/DoorDialog';
import { useServices } from '../hooks/servicesContext';
import { useAsync } from '../hooks/useAsync';

type DoorWithContent = Door & { content: DoorContent };

export function CalendarView({ participant }: { participant: Participant }) {
  const { services, dataVersion } = useServices();
  const calendar = useAsync(() => getCalendar(services, participant.id), [services, participant.id, dataVersion]);
  const [openDoorNumber, setOpenDoorNumber] = useState<number>();
  useEffect(() => (isDemo ? onDemo('open-door', setOpenDoorNumber) : undefined), []);

  // useAsync keeps the previous data while reloading, so an open dialog doesn't flicker.
  if (calendar.status === 'error') return <p className="card form-error">{calendar.error.message}</p>;
  if (calendar.status === 'loading') return <p className="loading">Nissen pynter kalenderen…</p>;
  const doors = calendar.data;

  const openDoor = doors.find((d): d is DoorWithContent => d.number === openDoorNumber && !!d.content);

  return (
    <>
      <Countdown />
      <AdventCalendar doors={doors} onOpenDoor={(door) => setOpenDoorNumber(door.number)} />
      {openDoor && <DoorDialog door={openDoor} participant={participant} onClose={() => setOpenDoorNumber(undefined)} />}
    </>
  );
}

function Countdown() {
  const { services } = useServices();
  const days = daysUntilFirstDoor(services.seasonYear, services.clock.today());
  if (days <= 0) return null;
  return (
    <p className="countdown">
      ⏳ Bare <strong>{days}</strong> {days === 1 ? 'dag' : 'dager'} til første luke åpner!
    </p>
  );
}
