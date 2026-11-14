import { useState } from 'react';
import { clearDoor, loadEditableDoors, type EditableDoor } from '../../../application/useCases/doorEditor';
import { isScored } from '../../../domain/scoring';
import { KIND_LABELS } from '../../components/door/kindLabels';
import { useServices } from '../../hooks/servicesContext';
import { useAsync } from '../../hooks/useAsync';
import { DoorEditor } from './DoorEditor';

/** All 24 days: what's behind each door, how many have answered – and an editor. */
export function DoorsAdmin() {
  const { services, dataVersion, notifyChanged } = useServices();
  const data = useAsync(
    async () => {
      const [doors, answers, participants] = await Promise.all([
        loadEditableDoors(services),
        services.answers.findAll(),
        services.participants.findAll(),
      ]);
      return { doors, answers, participants: participants.length };
    },
    [services, dataVersion],
  );
  const [editing, setEditing] = useState<EditableDoor>();
  const [message, setMessage] = useState<string>();
  const [confirmClear, setConfirmClear] = useState<number>();

  if (editing) {
    return (
      <DoorEditor
        key={editing.day}
        door={editing}
        onDone={(saved) => {
          setEditing(undefined);
          setMessage(saved ? `✅ Luke ${editing.day} er lagret.` : undefined);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  if (data.status === 'loading') return <p className="loading">Låser opp lukene…</p>;
  if (data.status === 'error') return <p className="card form-error">{data.error.message}</p>;

  const { doors, answers, participants } = data.data;

  const clear = async (door: EditableDoor) => {
    if (!door.draft.id) return;
    setConfirmClear(undefined);
    await clearDoor(services, door.draft.id);
    setMessage(`Luke ${door.day} er tømt.`);
    notifyChanged();
  };

  return (
    <>
      {message && <p className="notice">{message}</p>}
      <ul className="admin-list">
        {doors.map((door) => {
          const forDoor = answers.filter((a) => a.doorId === door.draft.id);
          const correct = forDoor.filter((a) => a.isCorrect).length;
          return (
            <li key={door.day} className="admin-list__item">
              <span className="admin-list__day">{door.day}</span>
              <span className="admin-list__text">
                {door.exists ? (
                  <>
                    <strong>{door.draft.title}</strong> · {KIND_LABELS[door.draft.kind]}
                    <br />
                    <small>
                      {forDoor.length}/{participants} har åpnet
                      {isScored({ kind: door.draft.kind }) && ` · ${correct} riktige`}
                    </small>
                  </>
                ) : (
                  <em>Tom luke</em>
                )}
              </span>
              <span className="admin-list__actions">
                <button type="button" className="button button--small" onClick={() => setEditing(door)}>
                  {door.exists ? '✏️ Rediger' : '+ Lag luke'}
                </button>
                {door.exists && door.answerCount === 0 && (
                  <button
                    type="button"
                    className={`button button--small ${confirmClear === door.day ? 'button--danger' : ''}`}
                    onClick={() => (confirmClear === door.day ? void clear(door) : setConfirmClear(door.day))}
                    onBlur={() => setConfirmClear(undefined)}
                  >
                    {confirmClear === door.day ? 'Sikker? Tøm!' : 'Tøm'}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
